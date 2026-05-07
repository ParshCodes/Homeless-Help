import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { triggerEmergency, listAlerts, acknowledgeAlert } from '../controllers/emergencyController.js';

const router = Router();

router.get('/', authenticate, listAlerts);
router.post('/:userId', authenticate, triggerEmergency);
router.post('/ack/:alertId', authenticate, acknowledgeAlert);

export default router;
