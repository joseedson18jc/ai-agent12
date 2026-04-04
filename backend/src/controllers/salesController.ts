import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as salesService from '../services/salesService.js';

const createSchema = z.object({
  customerId: z.string().uuid('ID do cliente inválido'),
  prescriptionId: z.string().uuid().optional(),
  sellerId: z.string().uuid('ID do vendedor inválido'),
  discountPercent: z.number().min(0).max(100).optional(),
  discountAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().uuid().optional(),
    description: z.string().optional(),
    unitPrice: z.number().min(0, 'Preço unitário deve ser positivo'),
    quantity: z.number().int().min(1, 'Quantidade deve ser pelo menos 1'),
    discountPercent: z.number().min(0).max(100).optional(),
    discountAmount: z.number().min(0).optional(),
  })).min(1, 'Pelo menos um item é obrigatório'),
  payments: z.array(z.object({
    method: z.enum(['CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'STORE_CREDIT', 'INSURANCE', 'EXCHANGE']),
    amount: z.number().min(0),
    cardBrand: z.string().optional(),
    cardInstallments: z.number().int().min(1).optional(),
    interestRate: z.number().min(0).optional(),
    justification: z.string().optional(),
    installmentCount: z.number().int().min(1).optional(),
  })).min(1, 'Pelo menos um pagamento é obrigatório'),
});

const statusSchema = z.object({
  status: z.enum(['AWAITING_LENS', 'IN_PRODUCTION', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED']),
});

const cancelSchema = z.object({
  reason: z.string().min(1, 'Motivo do cancelamento é obrigatório'),
});

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, customerId, sellerId, startDate, endDate, page, limit } = req.query;
    const result = await salesService.list({
      status: status as string,
      customerId: customerId as string,
      sellerId: sellerId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({
      success: true,
      data: result.orders,
      pagination: { page: result.page, limit: result.limit, total: result.total },
    });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await salesService.getById(req.params.id);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body);
    const order = await salesService.create(data, req.user!.userId, req.user!.role, req.ip);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const data = statusSchema.parse(req.body);
    const order = await salesService.updateStatus(req.params.id, data.status, req.user!.userId, req.ip);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction) {
  try {
    const data = cancelSchema.parse(req.body);
    await salesService.cancelOrder(req.params.id, data.reason, req.user!.userId, req.ip);
    res.json({ success: true, data: { message: 'Venda cancelada com sucesso' } });
  } catch (error) {
    next(error);
  }
}

export async function getPending(req: Request, res: Response, next: NextFunction) {
  try {
    const orders = await salesService.getPending();
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
}
