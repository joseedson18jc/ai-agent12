import dotenv from 'dotenv';
// Only load .env file in development — in production, env vars come from the platform
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { errorHandler } from './middlewares/errorHandler.js';
import { startScheduler } from './jobs/scheduler.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import prescriptionRoutes from './routes/prescriptionRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import billRoutes from './routes/billRoutes.js';
import billCategoryRoutes from './routes/billCategoryRoutes.js';
import cashRoutes from './routes/cashRoutes.js';
import laboratoryRoutes from './routes/laboratoryRoutes.js';
import lensOrderRoutes from './routes/lensOrderRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import userRoutes from './routes/userRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import auditRoutes from './routes/auditRoutes.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files (uploads)
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/bill-categories', billCategoryRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/laboratories', laboratoryRoutes);
app.use('/api/lens-orders', lensOrderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit', auditRoutes);

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(process.cwd(), 'public');
  app.use(express.static(frontendPath));
  // SPA fallback: any non-API route serves index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  // 404 handler (dev only — frontend runs on its own server)
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Rota não encontrada' });
  });
}

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`[Ótica Império] Servidor rodando na porta ${PORT}`);
  startScheduler();
});

export default app;
