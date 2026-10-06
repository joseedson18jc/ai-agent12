import { Router } from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.post('/', paymentController.create);
router.get('/receivables', paymentController.listReceivables);
router.put('/installments/:id/pay', paymentController.payInstallment);

export default router;
