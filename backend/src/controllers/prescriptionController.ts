import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as prescriptionService from '../services/prescriptionService.js';

const createSchema = z.object({
  customerId: z.string().uuid('ID do cliente inválido'),
  date: z.string().transform((val) => new Date(val)),
  doctor: z.string().optional(),
  doctorCrm: z.string().optional(),
  validity: z.string().transform((val) => new Date(val)),
  file: z.string().optional(),
  odSpherical: z.number().optional(),
  odCylindrical: z.number().optional(),
  odAxis: z.number().int().min(0).max(180).optional(),
  odDnp: z.number().optional(),
  odHeight: z.number().optional(),
  odAddition: z.number().optional(),
  oeSphrical: z.number().optional(),
  oeCylindrical: z.number().optional(),
  oeAxis: z.number().int().min(0).max(180).optional(),
  oeDnp: z.number().optional(),
  oeHeight: z.number().optional(),
  oeAddition: z.number().optional(),
  lensType: z.enum(['SINGLE_VISION', 'BIFOCAL', 'MULTIFOCAL']).optional(),
  treatments: z.array(z.enum(['ANTIREFLECTIVE', 'PHOTOCHROMIC', 'BLUE_LIGHT', 'TRANSITIONS'])).optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const search = req.query.search as string | undefined;
    const expiring = req.query.expiring === 'true';
    const expired = req.query.expired === 'true';
    const prescriptions = await prescriptionService.list(search, expiring, expired);
    res.json({ success: true, data: prescriptions });
  } catch (error) {
    next(error);
  }
}

export async function listByCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const prescriptions = await prescriptionService.listByCustomer(req.params.customerId);
    res.json({ success: true, data: prescriptions });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const prescription = await prescriptionService.getById(req.params.id);
    res.json({ success: true, data: prescription });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body);
    const prescription = await prescriptionService.create(data, req.user!.userId, req.ip);
    res.status(201).json({ success: true, data: prescription });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateSchema.parse(req.body);
    const prescription = await prescriptionService.update(req.params.id, data, req.user!.userId, req.ip);
    res.json({ success: true, data: prescription });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await prescriptionService.remove(req.params.id, req.user!.userId, req.ip);
    res.json({ success: true, data: { message: 'Receita excluída com sucesso' } });
  } catch (error) {
    next(error);
  }
}
