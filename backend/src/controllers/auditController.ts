import { Request, Response, NextFunction } from 'express';
import { listAuditLogs } from '../services/auditService.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, action, entity, entityId, startDate, endDate, page, limit } = req.query;
    const result = await listAuditLogs({
      userId: userId as string,
      action: action as string,
      entity: entity as string,
      entityId: entityId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({
      success: true,
      data: result.logs,
      pagination: { page: result.page, limit: result.limit, total: result.total },
    });
  } catch (error) {
    next(error);
  }
}
