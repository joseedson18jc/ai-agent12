import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as customerService from '../services/customerService.js';

// Campos opcionais aceitam null para permitir limpar o valor na edição
const optStr = () => z.string().nullable().optional();

const createSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cpf: optStr(),
  phone: z.string().min(10, 'Telefone inválido'),
  whatsapp: optStr(),
  email: z.string().email('E-mail inválido').nullable().optional().or(z.literal('')),
  birthDate: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val ? new Date(val) : val === null ? null : undefined)),
  zipCode: optStr(),
  street: optStr(),
  number: optStr(),
  complement: optStr(),
  neighborhood: optStr(),
  city: optStr(),
  state: optStr(),
  photo: optStr(),
  notes: optStr(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

const updateSchema = createSchema.partial();

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, status, city, createdFrom, page, limit } = req.query;
    const result = await customerService.listCustomers({
      search: search as string,
      status: status as string,
      city: city as string,
      createdFrom: createdFrom as string,
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
