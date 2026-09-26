import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as publicService from '../services/publicService.js';
import { AppError } from '../middlewares/errorHandler.js';

const leadSchema = z.object({
  type: z.enum(['RESERVATION', 'APPOINTMENT', 'CONTACT']),
  name: z.string().trim().min(2, 'Informe seu nome').max(120),
  phone: z
    .string()
    .trim()
    .refine((v) => {
      const d = v.replace(/\D/g, '');
      return d.length >= 10 && d.length <= 13;
    }, 'Informe um telefone com DDD'),
  email: z.string().trim().email('E-mail inválido').max(160).optional().or(z.literal('').transform(() => undefined)),
  message: z.string().max(1500).optional(),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Data inválida').optional().or(z.literal('').transform(() => undefined)),
  preferredTime: z.string().max(40).optional(),
  service: z.string().max(80).optional(),
  items: z
    .array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(10) }))
    .max(20)
    .optional(),
  // Honeypot: real people never fill this hidden field.
  website: z.string().optional(),
});

// Small in-memory limiter — enough to stop a form from being flooded.
const hits = new Map<string, number[]>();
function tooMany(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 12;
}

export async function store(_req: Request, res: Response, next: NextFunction) {
  try {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ success: true, data: await publicService.getStore() });
  } catch (error) {
    next(error);
  }
}

export async function categories(_req: Request, res: Response, next: NextFunction) {
  try {
    res.set('Cache-Control', 'public, max-age=120');
    res.json({ success: true, data: await publicService.listCategories() });
  } catch (error) {
    next(error);
  }
}

export async function products(req: Request, res: Response, next: NextFunction) {
  try {
    const q = req.query;
    const num = (v: unknown) => (v != null && v !== '' && !isNaN(Number(v)) ? Number(v) : undefined);
    if (q.ids) {
      const ids = String(q.ids).split(',').filter((id) => /^[0-9a-f-]{36}$/i.test(id));
      res.json({ success: true, data: await publicService.getProductsByIds(ids) });
      return;
    }
    const result = await publicService.listProducts({
      search: q.search ? String(q.search).slice(0, 80) : undefined,
      categoryId: q.categoryId ? String(q.categoryId) : undefined,
      brand: q.brand ? String(q.brand) : undefined,
      minPrice: num(q.minPrice),
      maxPrice: num(q.maxPrice),
      sort: q.sort ? String(q.sort) : undefined,
      inStockOnly: q.inStockOnly === 'false' ? false : true,
      page: num(q.page),
      limit: num(q.limit),
    });
    res.set('Cache-Control', 'public, max-age=60');
    res.json({
      success: true,
      data: result.products,
      pagination: { page: result.page, limit: result.limit, total: result.total },
      facets: result.facets,
    });
  } catch (error) {
    next(error);
  }
}

export async function product(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await publicService.getProduct(req.params.id) });
  } catch (error) {
    next(error);
  }
}

export async function createLead(req: Request, res: Response, next: NextFunction) {
  try {
    if (tooMany(req.ip || 'unknown')) throw new AppError('Muitas solicitações. Tente novamente mais tarde ou chame no WhatsApp.', 429);
    const data = leadSchema.parse(req.body);
    if (data.website) {
      // Pretend success to bots.
      res.status(201).json({ success: true, data: { id: 'ok' } });
      return;
    }
    const lead = await publicService.createLead(data);
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
}
