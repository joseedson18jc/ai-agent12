import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/authService.js';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  role: z.enum(['ADMIN', 'SELLER', 'VIEWER']),
});

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data.email, data.password, req.ip);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = registerSchema.parse(req.body);
    const user = await authService.registerUser(data, req.user!.userId, req.ip);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getMe(req.user!.userId);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}
