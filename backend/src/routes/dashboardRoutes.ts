import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/kpis', dashboardController.getKpis);
router.get('/sales-chart', dashboardController.getSalesChart);
router.get('/top-products', dashboardController.getTopProducts);
router.get('/recent-sales', dashboardController.getRecentSales);
router.get('/upcoming-reminders', dashboardController.getUpcomingReminders);

export default router;
