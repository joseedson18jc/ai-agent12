import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as supplierService from '../services/supplierService.js';

const createSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cnpj: z.string().optional(),
  contactName: z.string().optional(),
  contactRole: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  zipCode: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  category: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, page, limit } = req.query;
    const result = await supplierService.list({
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({
      success: true,
      data: result.suppliers,
      pagination: { page: result.page, limit: result.limit, total: result.total },
    });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const supplier = await supplierService.getById(req.params.id);
    res.json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body);
    const supplier = await supplierService.create(data, req.user!.userId, req.ip);
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateSchema.parse(req.body);
    const supplier = await supplierService.update(req.params.id, data, req.user!.userId, req.ip);
    res.json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await supplierService.remove(req.params.id, req.user!.userId, req.ip);
    res.json({ success: true, data: { message: 'Fornecedor excluído com sucesso' } });
  } catch (error) {
    next(error);
  }
}
