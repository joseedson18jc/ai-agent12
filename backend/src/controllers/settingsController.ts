import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as settingsService from '../services/settingsService.js';

const updateSchema = z.object({
  name: z.string().optional(),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  logo: z.string().optional(),
  defaultMarkup: z.number().min(0).optional(),
  billAlertDays: z.number().int().min(1).optional(),
  prescriptionAlertDays: z.number().int().min(1).optional(),
  defaultMinStock: z.number().int().min(0).optional(),
  printerType: z.string().optional(),
  whatsapp: z.string().max(20).optional(),
  instagram: z.string().max(60).optional(),
  openingHours: z.string().max(600).optional(),
  siteHeadline: z.string().max(160).optional(),
});

export async function getSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await settingsService.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateSchema.parse(req.body);
    const settings = await settingsService.updateSettings(data, req.user!.userId, req.ip);
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
}
