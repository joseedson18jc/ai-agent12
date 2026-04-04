import { Router } from 'express';
import * as laboratoryController from '../controllers/laboratoryController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', laboratoryController.list);
router.get('/:id', laboratoryController.getById);
router.post('/', laboratoryController.create);
router.put('/:id', laboratoryController.update);
router.delete('/:id', laboratoryController.remove);

export default router;
