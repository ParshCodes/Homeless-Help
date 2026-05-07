import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import userRoutes from './users.js';
import scanRoutes from './scans.js';
import uploadRoutes from './uploads.js';
import emergencyRoutes from './emergency.js';
import analyticsRoutes from './analytics.js';
import authRoutes from './auth.js';
import Person from '../models/Person.js';
import Scan from '../models/Scan.js';
import { sendPersonEmergencyNotifications } from '../services/notificationService.js';
import { requireSecuritySignature } from '../middleware/securityAuth.js';
import { recordSecurityEvent } from '../services/securityEventService.js';
import { io } from '../services/socketService.js';

const router = Router();

const uploadDir = path.resolve(process.cwd(), 'uploads');
const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const personUpload = multer({ storage });

const parseJsonIfString = (value, fallback) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }
  return value;
};

const normalizeContacts = (contacts) => {
  const resolved = parseJsonIfString(contacts, []);
  if (!Array.isArray(resolved)) return [];
  return resolved
    .filter((contact) => contact && contact.name && contact.phone)
    .map((contact) => ({
      name: String(contact.name).trim(),
      phone: String(contact.phone).trim(),
    }));
};

const normalizeConditions = (conditions) => {
  const resolved = parseJsonIfString(conditions, []);
  if (!Array.isArray(resolved)) return [];
  return resolved
    .filter((condition) => condition && condition.conditionName)
    .map((condition) => ({
      conditionName: String(condition.conditionName).trim(),
      description: condition.description ? String(condition.description).trim() : undefined,
    }));
};

const normalizeLocation = (location) => {
  const resolvedLocation = parseJsonIfString(location, undefined);
  const source = resolvedLocation || location;

  if (!source || typeof source !== 'object') return undefined;

  const { latitude, lat, longitude, lng, address } = source;
  const normalizeCoordinate = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const resolvedLat = normalizeCoordinate(lat ?? latitude);
  const resolvedLng = normalizeCoordinate(lng ?? longitude);

  if (resolvedLat === null || resolvedLng === null) return undefined;

  return {
    type: 'Point',
    coordinates: [resolvedLng, resolvedLat],
    address: address ? String(address).trim() : undefined,
  };
};

const normalizeCoords = (coords) => {
  const resolvedCoords = parseJsonIfString(coords, undefined);
  const source = resolvedCoords || coords;

  if (!source || typeof source !== 'object') return undefined;

  const { latitude, lat, longitude, lon, lng, address } = source;

  const normalizeCoordinate = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const resolvedLat = normalizeCoordinate(lat ?? latitude);
  const resolvedLon = normalizeCoordinate(lon ?? lng ?? longitude);

  if (resolvedLat === null || resolvedLon === null) return undefined;

  const normalized = {
    lat: resolvedLat,
    lon: resolvedLon,
  };

  if (typeof address === 'string' && address.trim()) {
    normalized.address = address.trim();
  }

  return normalized;
};

const buildPhotoMetadata = (file) => {
  if (!file) {
    return null;
  }

  return {
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    url: `/uploads/${file.filename}`,
    uploadedAt: new Date(),
  };
};

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/scans', scanRoutes);
router.use('/uploads', uploadRoutes);
router.use('/emergency', emergencyRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/alerts', emergencyRoutes);

router.post('/medicaid/eligibility', (req, res) => {
  const { pid, first, last, dob } = req.body || {};

  if (!pid || !first || !last || !dob) {
    return res.status(400).json({ message: 'pid, first, last, and dob are required.' });
  }

  const normalizedLast = String(last).toLowerCase();
  if (normalizedLast.includes('test')) {
    return res.json({ status: 'not-found' });
  }

  const parsedDob = new Date(dob);
  if (Number.isNaN(parsedDob.getTime())) {
    return res.status(400).json({ message: 'Invalid dob provided. Use ISO format YYYY-MM-DD.' });
  }

  const day = parsedDob.getUTCDate();

  if (day % 2 === 0) {
    return res.json({
      status: 'active',
      plan: 'Medi-Cal Managed Care (San Diego)',
      effective_from: '2025-01-01',
      effective_to: '2025-12-31',
    });
  }

  return res.json({ status: 'inactive' });
});

router.post('/person/register', personUpload.single('photo'), requireSecuritySignature, async (req, res) => {
  try {
    const {
      name,
      age,
      dateOfBirth,
      gender,
      ssn,
      medicalInfo,
      emergencyContact,
      emergencyContacts,
      medicalConditions,
    } = req.body;

    if (!name) {
      if (req.file) {
        fs.unlink(path.join(uploadDir, req.file.filename), () => {});
      }
      return res.status(400).json({ message: 'Name is required.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'A profile photo is required.' });
    }

    const photo = buildPhotoMetadata(req.file);

    if (!photo) {
      fs.unlink(path.join(uploadDir, req.file.filename), () => {});
      return res.status(400).json({ message: 'A profile photo is required.' });
    }

    const normalizedContacts = normalizeContacts(emergencyContacts);
    const normalizedConditions = normalizeConditions(medicalConditions);
    const normalizedLocation = normalizeLocation(req.body.location);

    const normalizedAge = (() => {
      if (age === undefined || age === null || age === '') {
        return undefined;
      }
      const parsed = Number.parseInt(age, 10);
      return Number.isNaN(parsed) ? undefined : parsed;
    })();

    let normalizedDob;
    if (dateOfBirth) {
      const parsed = new Date(dateOfBirth);
      if (!Number.isNaN(parsed.getTime())) {
        normalizedDob = parsed;
      }
    }

    const person = await Person.create({
      name,
      ...(normalizedAge !== undefined ? { age: normalizedAge } : {}),
      ...(normalizedDob ? { dateOfBirth: normalizedDob } : {}),
      gender,
      ssn,
      medicalInfo,
      emergencyContact,
      emergencyContacts: normalizedContacts,
      medicalConditions: normalizedConditions,
      ...(normalizedLocation ? { location: normalizedLocation } : {}),
      photo,
    });

    try {
      await recordSecurityEvent('RecordCreated', { userId: person._id, org: req.securityContext?.keyId });
    } catch (error) {
      console.error('Security event logging failed for person registration', error);
    }

    return res.status(201).json(person.toJSON());
  } catch (error) {
    if (req.file) {
      fs.unlink(path.join(uploadDir, req.file.filename), () => {});
    }
    return res.status(500).json({ message: 'Failed to register person.', error: error.message });
  }
});

router.get('/person/barcode/:barcodeId', async (req, res) => {
  try {
    const { barcodeId } = req.params;
    const person = await Person.findOne({ barcodeId }).lean();

    if (!person) {
      return res.status(404).json({ message: 'Person not found.' });
    }

    return res.json(person);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch person.', error: error.message });
  }
});

router.get('/person/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const person = await Person.findById(id).lean();

    if (!person) {
      return res.status(404).json({ message: 'Person not found.' });
    }

    return res.json(person);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch person.', error: error.message });
  }
});

router.put('/person/:id', requireSecuritySignature, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {
      name: req.body.name,
      age: req.body.age,
      gender: req.body.gender,
      ssn: req.body.ssn,
      medicalInfo: req.body.medicalInfo,
      emergencyContact: req.body.emergencyContact,
    };

    if (Object.prototype.hasOwnProperty.call(req.body, 'dateOfBirth')) {
      const incomingDob = req.body.dateOfBirth;
      if (!incomingDob) {
        updates.dateOfBirth = null;
      } else {
        const parsedDob = new Date(incomingDob);
        if (!Number.isNaN(parsedDob.getTime())) {
          updates.dateOfBirth = parsedDob;
        }
      }
    }

    if (req.body.emergencyContacts) {
      updates.emergencyContacts = normalizeContacts(req.body.emergencyContacts);
    }

    if (req.body.medicalConditions) {
      updates.medicalConditions = normalizeConditions(req.body.medicalConditions);
    }

    const normalizedLocation = normalizeLocation(req.body.location);
    if (normalizedLocation) {
      updates.location = normalizedLocation;
    }

    const person = await Person.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!person) {
      return res.status(404).json({ message: 'Person not found.' });
    }

    try {
      await recordSecurityEvent('RecordUpdated', { userId: person._id, org: req.securityContext?.keyId });
    } catch (error) {
      console.error('Security event logging failed for person update', error);
    }

    return res.json(person.toJSON());
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update person.', error: error.message });
  }
});

router.post('/person/:id/documents', requireSecuritySignature, personUpload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Document is required.' });
  }

  try {
    const { id } = req.params;
    const document = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
      uploadedAt: new Date(),
    };

    const person = await Person.findByIdAndUpdate(
      id,
      { $push: { documents: document } },
      { new: true }
    );

    if (!person) {
      fs.unlink(path.join(uploadDir, req.file.filename), () => {});
      return res.status(404).json({ message: 'Person not found.' });
    }

    try {
      await recordSecurityEvent('RecordUpdated', { userId: person._id, org: req.securityContext?.keyId });
    } catch (error) {
      console.error('Security event logging failed for document upload', error);
    }

    return res.status(201).json({ document, person: person.toJSON() });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to upload document.', error: error.message });
  }
});

router.post('/person/:id/emergency', async (req, res) => {
  try {
    const { id } = req.params;
    const person = await Person.findById(id);

    if (!person) {
      return res.status(404).json({ message: 'Person not found.' });
    }

    await sendPersonEmergencyNotifications(person, {
      message: req.body?.message || `SafeSpot alert: ${person.name} requires immediate assistance.`,
    });

    return res.json({ message: 'Emergency contacts notified.' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to trigger emergency notifications.', error: error.message });
  }
});

router.get('/person/:id/documents', async (req, res) => {
  try {
    const { id } = req.params;
    const person = await Person.findById(id).lean();

    if (!person) {
      return res.status(404).json({ message: 'Person not found.' });
    }

    return res.json(person.documents || []);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch documents.', error: error.message });
  }
});

router.get('/person/:id/scans', async (req, res) => {
  try {
    const { id } = req.params;
    const scans = await Scan.find({ user_id: id }).sort({ timestamp: -1 }).limit(Number(req.query.limit) || 30);
    return res.json(scans);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch scans.', error: error.message });
  }
});

router.post('/scan', async (req, res) => {
  try {
    const { personId, coords, orgId, type, role } = req.body;

    if (!personId) {
      return res.status(400).json({ message: 'personId is required to log a scan.' });
    }

    const person = await Person.findById(personId).lean();

    if (!person) {
      return res.status(404).json({ message: 'Person not found.' });
    }

    const normalizedCoords = normalizeCoords(coords);
    const scanRole = typeof role === 'string' && role.trim() ? role.trim() : null;
    const scanType = typeof type === 'string' && type.trim() ? type.trim() : scanRole || 'Outreach';

    let updatedPerson = person;
    let normalizedLocation;
    if (normalizedCoords) {
      normalizedLocation = {
        type: 'Point',
        coordinates: [normalizedCoords.lon, normalizedCoords.lat],
      };

      if (normalizedCoords.address) {
        normalizedLocation.address = normalizedCoords.address;
      } else if (person.location?.address) {
        normalizedLocation.address = person.location.address;
      }

      updatedPerson = await Person.findByIdAndUpdate(
        personId,
        { $set: { location: normalizedLocation } },
        { new: true }
      )
        .lean()
        .exec();

      if (!updatedPerson) {
        updatedPerson = person;
      }
    }

    const securityHash = await recordSecurityEvent('RecordUpdated', { userId: personId, org: orgId, scope: 'scan' });

    const scanRecord = await Scan.create({
      user_id: personId,
      org_id: orgId,
      coords: normalizedCoords,
      location: normalizedLocation,
      type: scanType,
      role: scanRole,
      timestamp: new Date(),
      security_hash: securityHash,
    });

    const scanEvent = {
      _id: scanRecord._id,
      type: scanRecord.type,
      coords: normalizedCoords,
      timestamp: scanRecord.timestamp || scanRecord.createdAt,
      personId,
      name: updatedPerson?.name,
      barcodeId: updatedPerson?.barcodeId,
      address: normalizedCoords?.address ?? updatedPerson?.location?.address,
      orgId,
      role: scanRole,
      security_hash: securityHash,
    };

    if (io) {
      io.emit('scan-event', scanEvent);
    }

    return res.status(201).json({ message: 'Scan logged.', scanId: scanRecord._id, scan: scanEvent, securityHash });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to log scan.', error: error.message });
  }
});

export default router;
