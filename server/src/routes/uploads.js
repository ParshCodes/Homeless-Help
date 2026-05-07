import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { handleUpload } from '../controllers/uploadController.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post('/:userId', authenticate, upload.single('document'), handleUpload);

export default router;
