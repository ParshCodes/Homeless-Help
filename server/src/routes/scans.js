import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { recordScan, listScans } from '../controllers/scanController.js';

const router = Router();

router.get('/', authenticate, listScans);
router.post('/record', authenticate, recordScan);

export default router;
