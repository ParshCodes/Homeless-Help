import Alert from '../models/Alert.js';
import User from '../models/User.js';
import { sendEmergencyNotifications } from '../services/notificationService.js';
import { recordSecurityEvent } from '../services/securityEventService.js';
import { io } from '../services/socketService.js';

export async function listAlerts(req, res) {
  const alerts = await Alert.find().sort({ timestamp: -1 }).limit(50);
  res.json(alerts);
}

export async function triggerEmergency(req, res) {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const securityHash = await recordSecurityEvent('EmergencyAlert', { userId, org: req.org });

  const alert = await Alert.create({
    user_id: userId,
    org_id: req.org,
    message: `${user.name} marked urgent`,
    status: 'active',
    timestamp: new Date(),
    security_hash: securityHash,
  });
  await sendEmergencyNotifications(user, alert);
  io.emit('emergency-alert', { ...alert.toJSON(), security_hash: securityHash });
  res.status(201).json({ alert, securityHash });
}

export async function acknowledgeAlert(req, res) {
  const { alertId } = req.params;
  const alert = await Alert.findByIdAndUpdate(alertId, { status: 'ack' }, { new: true });
  io.emit('emergency-alert', alert);
  res.json(alert);
}
