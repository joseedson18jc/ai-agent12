import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma.js';
import { authenticate } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';
import { createAuditLog } from '../services/auditService.js';

// CRM inbox for requests made on the public storefront.
const router = Router();
router.use(authenticate);

const updateSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'CONVERTED', 'DISCARDED']).optional(),
  notes: z.string().max(2000).nullable().optional(),
  customerId: z.string().uuid().nullable().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const { status, type, search } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const where: any = {};
    if (status) where.status = String(status);
    if (type) where.type = String(type);
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { phone: { contains: String(search).replace(/\D/g, '') || String(search) } },
        { email: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    const [leads, total] = await Promise.all([
      prisma.webLead.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.webLead.count({ where }),
    ]);
    res.json({ success: true, data: leads, pagination: { page, limit, total } });
  } catch (error) {
    next(error);
  }
});

router.get('/stats', async (_req, res, next) => {
  try {
    const grouped = await prisma.webLead.groupBy({ by: ['status', 'type'], _count: true });
    const byStatus: Record<string, number> = { NEW: 0, CONTACTED: 0, CONVERTED: 0, DISCARDED: 0 };
    const byType: Record<string, number> = { RESERVATION: 0, APPOINTMENT: 0, CONTACT: 0 };
    for (const g of grouped) {
      byStatus[g.status] += g._count;
      byType[g.type] += g._count;
    }
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const last30 = await prisma.webLead.count({ where: { createdAt: { gte: since } } });
    res.json({ success: true, data: { byStatus, byType, last30, newCount: byStatus.NEW } });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const existing = await prisma.webLead.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Solicitação não encontrada', 404);
    const lead = await prisma.webLead.update({ where: { id: req.params.id }, data });
    await createAuditLog({
      userId: req.user!.userId, action: 'UPDATE', entity: 'WebLead', entityId: lead.id,
      details: { changes: data }, ipAddress: req.ip,
    });
    res.json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.webLead.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Solicitação não encontrada', 404);
    await prisma.webLead.delete({ where: { id: req.params.id } });
    await createAuditLog({
      userId: req.user!.userId, action: 'DELETE', entity: 'WebLead', entityId: existing.id,
      details: { name: existing.name, type: existing.type }, ipAddress: req.ip,
    });
    res.json({ success: true, data: { message: 'Solicitação excluída' } });
  } catch (error) {
    next(error);
  }
});

export default router;
