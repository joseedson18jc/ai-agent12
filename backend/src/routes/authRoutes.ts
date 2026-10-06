import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.post('/login', authController.login);
router.post('/register', authenticate, requireRole('ADMIN'), authController.register);
router.get('/me', authenticate, authController.getMe);

export default router;
