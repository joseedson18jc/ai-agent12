import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as paymentService from '../services/paymentService.js';

const createSchema = z.object({
  salesOrderId: z.string().uuid('ID da venda inválido'),
  method: z.enum(['CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'STORE_CREDIT', 'INSURANCE', 'EXCHANGE']),
  amount: z.number().min(0, 'Valor deve ser positivo'),
  cardBrand: z.string().optional(),
  cardInstallments: z.number().int().min(1).optional(),
  interestRate: z.number().min(0).optional(),
  justification: z.string().optional(),
  installmentCount: z.number().int().min(1).optional(),
});

const payInstallmentSchema = z.object({
  paidAmount: z.number().min(0, 'Valor deve ser positivo'),
  paymentMethod: z.enum(['CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'STORE_CREDIT', 'INSURANCE', 'EXCHANGE']).optional(),
  notes: z.string().optional(),
});

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body);
    const payment = await paymentService.createPayment(data, req.user!.userId, req.ip);
    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
}

export async function listReceivables(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, page, limit } = req.query;
    const result = await paymentService.listReceivables({
      status: status as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({
      success: true,
      data: result.installments,
      pagination: { page: result.page, limit: result.limit, total: result.total },
    });
  } catch (error) {
    next(error);
  }
}

export async function payInstallment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = payInstallmentSchema.parse(req.body);
    const installment = await paymentService.payInstallment(req.params.id, data, req.user!.userId, req.ip);
    res.json({ success: true, data: installment });
  } catch (error) {
    next(error);
  }
}
