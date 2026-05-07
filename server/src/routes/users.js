import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getUsers, getUserById, createUser, updateUser } from '../controllers/userController.js';

const router = Router();

router.get('/', authenticate, getUsers);
router.post('/', authenticate, createUser);
router.get('/:id', authenticate, getUserById);
router.put('/:id', authenticate, updateUser);

export default router;
