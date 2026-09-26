import { Router } from 'express';
import * as publicController from '../controllers/publicController.js';

// Public storefront API — no authentication.
const router = Router();

router.get('/store', publicController.store);
router.get('/categories', publicController.categories);
router.get('/products', publicController.products);
router.get('/products/:id', publicController.product);
router.post('/leads', publicController.createLead);

export default router;
