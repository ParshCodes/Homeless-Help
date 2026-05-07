import Scan from '../models/Scan.js';
import User from '../models/User.js';
import { recordSecurityEvent } from '../services/securityEventService.js';
import { io } from '../services/socketService.js';

export async function listScans(req, res) {
  const scans = await Scan.find().sort({ timestamp: -1 }).limit(Number(req.query.limit) || 25);
  res.json(scans);
}

export async function recordScan(req, res) {
  const { qrData } = req.body;
  const profile = await User.findOne({ qr_code_url: qrData }) || await User.findById(qrData);
  if (!profile) return res.status(404).json({ message: 'Profile not found' });
  const securityHash = await recordSecurityEvent('RecordUpdated', { userId: profile._id, org: req.org });

  const parseCoordinate = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return null;
  };

  const incomingCoords = req.body.coords && typeof req.body.coords === 'object' ? req.body.coords : null;
  const resolvedLat = parseCoordinate(incomingCoords?.lat ?? incomingCoords?.latitude);
  const resolvedLon = parseCoordinate(incomingCoords?.lon ?? incomingCoords?.lng ?? incomingCoords?.longitude);
  const normalizedCoords =
    resolvedLat !== null && resolvedLon !== null
      ? {
          lat: resolvedLat,
          lon: resolvedLon,
          ...(incomingCoords?.address && typeof incomingCoords.address === 'string'
            ? { address: incomingCoords.address.trim() }
            : {}),
        }
      : null;

  const fallbackCoords = normalizedCoords || { lat: 32.7157, lon: -117.1611 };
  const normalizedLocation = {
    type: 'Point',
    coordinates: [fallbackCoords.lon, fallbackCoords.lat],
  };

  if (fallbackCoords.address) {
    normalizedLocation.address = fallbackCoords.address;
  }

  const scan = await Scan.create({
    user_id: profile._id,
    org_id: req.org,
    coords: fallbackCoords,
    location: normalizedLocation,
    type: req.body.type || 'Outreach',
    timestamp: new Date(),
    security_hash: securityHash,
  });
  io.emit('scan-event', scan);
  res.status(201).json({ scan, profile: profile.toJSON(), securityHash });
}
