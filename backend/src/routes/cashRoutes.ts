import { Router } from 'express';
import * as cashController from '../controllers/cashController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.post('/open', cashController.open);
router.post('/close/:id', cashController.close);
router.post('/movement', cashController.addMovement);
router.get('/current', cashController.getCurrent);
router.get('/history', cashController.getHistory);

export default router;
