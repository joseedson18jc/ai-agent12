import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as lensOrderService from '../services/lensOrderService.js';

const createSchema = z.object({
  salesOrderId: z.string().uuid('ID da venda inválido'),
  laboratoryId: z.string().uuid('ID do laboratório inválido'),
  prescriptionData: z.any().optional(),
  lensType: z.string().optional(),
  treatments: z.string().optional(),
  expectedDelivery: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  cost: z.number().min(0).optional(),
  notes: z.string().optional(),
});

const statusSchema = z.object({
  status: z.enum(['ORDERED', 'IN_PRODUCTION', 'READY', 'RECEIVED', 'CANCELLED']),
  receivedDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  notes: z.string().optional(),
});

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, laboratoryId, page, limit } = req.query;
    const result = await lensOrderService.list({
      status: status as string,
      laboratoryId: laboratoryId as string,
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

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body);
    const order = await lensOrderService.create(data, req.user!.userId, req.ip);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const data = statusSchema.parse(req.body);
    const order = await lensOrderService.updateStatus(req.params.id, data, req.user!.userId, req.ip);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
}

export async function getPending(req: Request, res: Response, next: NextFunction) {
  try {
    const orders = await lensOrderService.getPending();
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
}
