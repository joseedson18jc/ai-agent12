import { Router } from 'express';
import * as auditController from '../controllers/auditController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/', auditController.list);

export default router;
