import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as categoryService from '../services/categoryService.js';

const createSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  type: z.enum([
    'FRAMES_PRESCRIPTION', 'FRAMES_SUN', 'OPHTHALMIC_LENSES',
    'CONTACT_LENSES', 'SUNGLASSES_READY', 'ACCESSORIES',
  ]),
  defaultMarkup: z.number().min(0).optional(),
});

const updateSchema = createSchema.partial();

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await categoryService.list();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await categoryService.getById(req.params.id);
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body);
    const category = await categoryService.create(data, req.user!.userId, req.ip);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateSchema.parse(req.body);
    const category = await categoryService.update(req.params.id, data, req.user!.userId, req.ip);
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await categoryService.remove(req.params.id, req.user!.userId, req.ip);
    res.json({ success: true, data: { message: 'Categoria excluída com sucesso' } });
  } catch (error) {
    next(error);
  }
}
