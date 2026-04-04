import { Router } from 'express';
import * as prescriptionController from '../controllers/prescriptionController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/customer/:customerId', prescriptionController.listByCustomer);
router.get('/:id', prescriptionController.getById);
router.post('/', prescriptionController.create);
router.put('/:id', prescriptionController.update);
router.delete('/:id', prescriptionController.remove);

export default router;
