import { Router } from 'express';
import * as productController from '../controllers/productController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/low-stock', productController.getLowStock);
router.post('/validate-price', productController.validatePrice);
router.get('/', productController.list);
router.get('/:id', productController.getById);
router.post('/', productController.create);
router.put('/:id', productController.update);
router.delete('/:id', productController.remove);

export default router;
