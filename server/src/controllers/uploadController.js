import { encryptBuffer } from '../utils/crypto.js';
import User from '../models/User.js';
import { recordSecurityEvent } from '../services/securityEventService.js';
import { io } from '../services/socketService.js';

export async function handleUpload(req, res) {
  const { userId } = req.params;
  if (!req.file) return res.status(400).json({ message: 'File required' });
  const encrypted = encryptBuffer(req.file.buffer);
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $push: {
        medical_docs: {
          file_url: `encrypted://${encrypted.hash}`,
          uploaded_by: req.user?.id,
          uploaded_at: new Date(),
        },
      },
    },
    { new: true }
  );
  const securityHash = await recordSecurityEvent('RecordUpdated', { userId, org: req.org });
  io.emit('medical-update', { userId, securityHash });
  res.json({ success: true, securityHash });
}
