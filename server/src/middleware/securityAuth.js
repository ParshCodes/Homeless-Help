import fs from 'fs';
import { createHmac, timingSafeEqual } from 'crypto';

const FIVE_MINUTES = 5 * 60 * 1000;

function stableStringify(value) {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const keys = Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort();

  const serialized = keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',');

  return `{${serialized}}`;
}

function cleanupUploadedFiles(req) {
  if (req.file?.path) {
    fs.unlink(req.file.path, () => {});
  }

  if (Array.isArray(req.files)) {
    req.files.forEach((file) => {
      if (file?.path) {
        fs.unlink(file.path, () => {});
      }
    });
  } else if (req.files && typeof req.files === 'object') {
    Object.values(req.files).forEach((value) => {
      if (Array.isArray(value)) {
        value.forEach((file) => {
          if (file?.path) {
            fs.unlink(file.path, () => {});
          }
        });
      } else if (value?.path) {
        fs.unlink(value.path, () => {});
      }
    });
  }
}

function computeBodyHash(body) {
  const canonical = stableStringify(body && Object.keys(body).length ? body : {});
  return createHmac('sha256', 'safespot-body-salt').update(canonical).digest('hex');
}

export function requireSecuritySignature(req, res, next) {
  try {
    const signature = req.headers['x-security-signature'];
    const keyId = req.headers['x-security-key'] || 'default';
    const timestampHeader = req.headers['x-security-timestamp'];

    if (!signature || !timestampHeader) {
      cleanupUploadedFiles(req);
      return res.status(401).json({ message: 'Security signature and timestamp headers are required.' });
    }

    const timestamp = Number(timestampHeader);
    if (Number.isNaN(timestamp)) {
      cleanupUploadedFiles(req);
      return res.status(401).json({ message: 'Security timestamp header is invalid.' });
    }

    if (Math.abs(Date.now() - timestamp) > FIVE_MINUTES) {
      cleanupUploadedFiles(req);
      return res.status(401).json({ message: 'Security signature timestamp is outside the acceptable window.' });
    }

    const sharedSecret = process.env.SECURITY_SHARED_SECRET || process.env.LEDGER_SHARED_SECRET || 'safespot-demo-secret';
    const message = `SafeSpotSecurity|${timestamp}|${req.method.toUpperCase()}|${req.originalUrl}|${computeBodyHash(req.body || {})}|${keyId}`;

    const expected = createHmac('sha256', `${sharedSecret}|${keyId}`).update(message).digest('hex');
    const provided = Buffer.from(signature, 'hex');
    const comparison = Buffer.from(expected, 'hex');

    if (provided.length !== comparison.length || !timingSafeEqual(provided, comparison)) {
      cleanupUploadedFiles(req);
      return res.status(401).json({ message: 'Security signature verification failed.' });
    }

    req.securityContext = { keyId };
    return next();
  } catch (error) {
    cleanupUploadedFiles(req);
    return res.status(401).json({ message: 'Invalid security signature.', error: error.message });
  }
}
