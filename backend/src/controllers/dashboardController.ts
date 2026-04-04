import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboardService.js';

export async function getKpis(req: Request, res: Response, next: NextFunction) {
  try {
    const kpis = await dashboardService.getKpis();
    res.json({ success: true, data: kpis });
  } catch (error) {
    next(error);
  }
}

export async function getSalesChart(req: Request, res: Response, next: NextFunction) {
  try {
    const { groupBy, days } = req.query;
    const data = await dashboardService.getSalesChart({
      groupBy: groupBy as string,
      days: days ? parseInt(days as string) : undefined,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getTopProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.getTopProducts();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getRecentSales(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.getRecentSales();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getUpcomingReminders(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.getUpcomingReminders();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
