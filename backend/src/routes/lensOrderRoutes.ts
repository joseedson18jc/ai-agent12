import { Router } from 'express';
import * as lensOrderController from '../controllers/lensOrderController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/pending', lensOrderController.getPending);
router.get('/', lensOrderController.list);
router.post('/', lensOrderController.create);
router.put('/:id/status', lensOrderController.updateStatus);

export default router;
