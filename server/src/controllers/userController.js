import { encryptField } from '../utils/crypto.js';
import User from '../models/User.js';
import { recordSecurityEvent } from '../services/securityEventService.js';

export async function getUsers(req, res) {
  const users = await User.find().limit(50);
  res.json(users.map((user) => user.toJSON()));
}

export async function getUserById(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json(user.toJSON());
}

export async function createUser(req, res) {
  const payload = req.body;
  if (payload.ssn) {
    payload.ssn_encrypted = encryptField(payload.ssn);
  }
  const user = await User.create(payload);
  await recordSecurityEvent('RecordCreated', { userId: user._id, org: req.org });
  res.status(201).json(user.toJSON());
}

export async function updateUser(req, res) {
  const payload = req.body;
  if (payload.ssn) {
    payload.ssn_encrypted = encryptField(payload.ssn);
  }
  const user = await User.findByIdAndUpdate(req.params.id, payload, { new: true });
  await recordSecurityEvent('RecordUpdated', { userId: user._id, org: req.org });
  res.json(user.toJSON());
}
