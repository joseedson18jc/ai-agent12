import { Router } from 'express';
import * as reportController from '../controllers/reportController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/sales', reportController.salesReport);
router.get('/financial', reportController.financialReport);
router.get('/stock', reportController.stockReport);
router.get('/customers', reportController.customersReport);

export default router;
