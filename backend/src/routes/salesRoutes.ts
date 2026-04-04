import { Router } from 'express';
import * as salesController from '../controllers/salesController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/pending', salesController.getPending);
router.get('/', salesController.list);
router.get('/:id', salesController.getById);
router.post('/', salesController.create);
router.put('/:id/status', salesController.updateStatus);
router.put('/:id/cancel', salesController.cancel);

export default router;
