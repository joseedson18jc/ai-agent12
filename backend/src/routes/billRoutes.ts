import { Router } from 'express';
import * as billController from '../controllers/billController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/upcoming', billController.getUpcoming);
router.get('/overdue', billController.getOverdue);
router.get('/', billController.list);
router.get('/:id', billController.getById);
router.post('/', billController.create);
router.put('/:id', billController.update);
router.put('/:id/pay', billController.pay);
router.delete('/:id', billController.remove);

export default router;
