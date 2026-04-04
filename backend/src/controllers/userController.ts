import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as userService from '../services/userService.js';

const createSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  role: z.enum(['ADMIN', 'SELLER', 'VIEWER']),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'SELLER', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
});

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = req.query;
    const result = await userService.list({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({
      success: true,
      data: result.users,
      pagination: { page: result.page, limit: result.limit, total: result.total },
    });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getById(req.params.id);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body);
    const user = await userService.create(data, req.user!.userId, req.ip);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateSchema.parse(req.body);
    const user = await userService.update(req.params.id, data, req.user!.userId, req.ip);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await userService.remove(req.params.id, req.user!.userId, req.ip);
    res.json({ success: true, data: { message: 'Usuário desativado com sucesso' } });
  } catch (error) {
    next(error);
  }
}
