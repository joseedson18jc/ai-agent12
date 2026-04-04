import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as reportService from '../services/reportService.js';

const periodSchema = z.object({
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
});

export async function salesReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate, categoryId, sellerId, paymentMethod } = req.query;
    if (!startDate || !endDate) {
      res.status(400).json({ success: false, error: 'Datas de início e fim são obrigatórias' });
      return;
    }
    const data = await reportService.salesReport({
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
      categoryId: categoryId as string,
      sellerId: sellerId as string,
      paymentMethod: paymentMethod as string,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function financialReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      res.status(400).json({ success: false, error: 'Datas de início e fim são obrigatórias' });
      return;
    }
    const data = await reportService.financialReport({
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function stockReport(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reportService.stockReport();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function customersReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      res.status(400).json({ success: false, error: 'Datas de início e fim são obrigatórias' });
      return;
    }
    const data = await reportService.customersReport({
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
