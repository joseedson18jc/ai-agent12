import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as customerService from '../services/customerService.js';

const createSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cpf: z.string().optional(),
  phone: z.string().min(10, 'Telefone inválido'),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  birthDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  zipCode: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  photo: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, status, page, limit } = req.query;
    const result = await customerService.listCustomers({
      search: search as string,
      status: status as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({
      success: true,
      data: result.customers,
      pagination: { page: result.page, limit: result.limit, total: result.total },
    });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body);
    const customer = await customerService.createCustomer(data, req.user!.userId, req.ip);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateSchema.parse(req.body);
    const customer = await customerService.updateCustomer(req.params.id, data, req.user!.userId, req.ip);
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await customerService.deleteCustomer(req.params.id, req.user!.userId, req.ip);
    res.json({ success: true, data: { message: 'Cliente excluído com sucesso' } });
  } catch (error) {
    next(error);
  }
}

export async function getBirthdaysMonth(req: Request, res: Response, next: NextFunction) {
  try {
    const customers = await customerService.getBirthdaysThisMonth();
    res.json({ success: true, data: customers });
  } catch (error) {
    next(error);
  }
}
