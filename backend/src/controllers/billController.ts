import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as billService from '../services/billService.js';

const createSchema = z.object({
  description: z.string().min(2, 'Descrição deve ter pelo menos 2 caracteres'),
  categoryId: z.string().uuid('ID da categoria inválido'),
  supplierId: z.string().uuid().optional(),
  amount: z.number().min(0, 'Valor deve ser positivo'),
  dueDate: z.string().transform((val) => new Date(val)),
  isRecurring: z.boolean().optional(),
  frequency: z.enum(['WEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL']).optional(),
  parentBillId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

const paySchema = z.object({
  paymentMethod: z.enum(['CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'STORE_CREDIT', 'INSURANCE', 'EXCHANGE']),
  receipt: z.string().optional(),
});

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, categoryId, supplierId, startDate, endDate, page, limit } = req.query;
    const result = await billService.list({
      status: status as string,
      categoryId: categoryId as string,
      supplierId: supplierId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({
      success: true,
      data: result.bills,
      pagination: { page: result.page, limit: result.limit, total: result.total },
    });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const bill = await billService.getById(req.params.id);
    res.json({ success: true, data: bill });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body);
    const bill = await billService.create(data, req.user!.userId, req.ip);
    res.status(201).json({ success: true, data: bill });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateSchema.parse(req.body);
    const bill = await billService.update(req.params.id, data, req.user!.userId, req.ip);
    res.json({ success: true, data: bill });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await billService.remove(req.params.id, req.user!.userId, req.ip);
    res.json({ success: true, data: { message: 'Conta excluída com sucesso' } });
  } catch (error) {
    next(error);
  }
}

export async function getUpcoming(req: Request, res: Response, next: NextFunction) {
  try {
    const bills = await billService.getUpcoming();
    res.json({ success: true, data: bills });
  } catch (error) {
    next(error);
  }
}

export async function getOverdue(req: Request, res: Response, next: NextFunction) {
  try {
    const bills = await billService.getOverdue();
    res.json({ success: true, data: bills });
  } catch (error) {
    next(error);
  }
}

export async function pay(req: Request, res: Response, next: NextFunction) {
  try {
    const data = paySchema.parse(req.body);
    const bill = await billService.payBill(req.params.id, data, req.user!.userId, req.ip);
    res.json({ success: true, data: bill });
  } catch (error) {
    next(error);
  }
}
