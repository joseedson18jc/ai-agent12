import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as cashService from '../services/cashService.js';

const openSchema = z.object({
  openingBalance: z.number().min(0, 'Valor de abertura deve ser positivo'),
  notes: z.string().optional(),
});

const closeSchema = z.object({
  reportedBalance: z.number().min(0, 'Valor informado deve ser positivo'),
  notes: z.string().optional(),
});

const movementSchema = z.object({
  cashRegisterId: z.string().uuid('ID do caixa inválido'),
  type: z.enum(['INFLOW', 'OUTFLOW', 'WITHDRAWAL', 'SUPPLEMENT']),
  amount: z.number().min(0, 'Valor deve ser positivo'),
  description: z.string().optional(),
  salesOrderId: z.string().uuid().optional(),
  billToPayId: z.string().uuid().optional(),
});

export async function open(req: Request, res: Response, next: NextFunction) {
  try {
    const data = openSchema.parse(req.body);
    const register = await cashService.openRegister(data, req.user!.userId, req.ip);
    res.status(201).json({ success: true, data: register });
  } catch (error) {
    next(error);
  }
}

export async function close(req: Request, res: Response, next: NextFunction) {
  try {
    const data = closeSchema.parse(req.body);
    const register = await cashService.closeRegister(req.params.id, data, req.user!.userId, req.ip);
    res.json({ success: true, data: register });
  } catch (error) {
    next(error);
  }
}

export async function addMovement(req: Request, res: Response, next: NextFunction) {
  try {
    const data = movementSchema.parse(req.body);
    const movement = await cashService.addMovement(data, req.user!.userId, req.ip);
    res.status(201).json({ success: true, data: movement });
  } catch (error) {
    next(error);
  }
}

export async function getCurrent(req: Request, res: Response, next: NextFunction) {
  try {
    const register = await cashService.getCurrent();
    res.json({ success: true, data: register });
  } catch (error) {
    next(error);
  }
}

export async function getHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate, page, limit } = req.query;
    const result = await cashService.getHistory({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({
      success: true,
      data: result.registers,
      pagination: { page: result.page, limit: result.limit, total: result.total },
    });
  } catch (error) {
    next(error);
  }
}
