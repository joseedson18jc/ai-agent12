import { Router } from 'express';
import * as settingsController from '../controllers/settingsController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', settingsController.getSettings);
router.put('/', requireRole('ADMIN'), settingsController.updateSettings);

export default router;
