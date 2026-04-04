import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as laboratoryService from '../services/laboratoryService.js';

const createSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  contactName: z.string().optional(),
  terms: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, page, limit } = req.query;
    const result = await laboratoryService.list({
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({
      success: true,
      data: result.laboratories,
      pagination: { page: result.page, limit: result.limit, total: result.total },
    });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const lab = await laboratoryService.getById(req.params.id);
    res.json({ success: true, data: lab });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body);
    const lab = await laboratoryService.create(data, req.user!.userId, req.ip);
    res.status(201).json({ success: true, data: lab });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateSchema.parse(req.body);
    const lab = await laboratoryService.update(req.params.id, data, req.user!.userId, req.ip);
    res.json({ success: true, data: lab });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await laboratoryService.remove(req.params.id, req.user!.userId, req.ip);
    res.json({ success: true, data: { message: 'Laboratório excluído com sucesso' } });
  } catch (error) {
    next(error);
  }
}
