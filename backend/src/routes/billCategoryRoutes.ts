import { Router } from 'express';
import * as billCategoryController from '../controllers/billCategoryController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', billCategoryController.list);
router.get('/:id', billCategoryController.getById);
router.post('/', billCategoryController.create);
router.put('/:id', billCategoryController.update);
router.delete('/:id', billCategoryController.remove);

export default router;
