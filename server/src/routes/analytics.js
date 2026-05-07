import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getMetrics, getRegistrationEvents, getScanEvents } from '../controllers/analyticsController.js';

const router = Router();

router.get('/metrics', authenticate, getMetrics);
router.get('/registrations', authenticate, getRegistrationEvents);
router.get('/scans', authenticate, getScanEvents);

export default router;
