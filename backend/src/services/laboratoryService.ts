import prisma from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { createAuditLog } from './auditService.js';

export async function list(filters: { search?: string; page?: number; limit?: number }) {
  const { page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where: any = { isDeleted: false };
  if (filters.search) {
    where.name = { contains: filters.search, mode: 'insensitive' };
  }

  const [laboratories, total] = await Promise.all([
    prisma.laboratory.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }),
    prisma.laboratory.count({ where }),
  ]);

  return { laboratories, total, page, limit };
}

export async function getById(id: string) {
  const lab = await prisma.laboratory.findFirst({
    where: { id, isDeleted: false },
    include: { lensOrders: { where: { isDeleted: false }, orderBy: { orderDate: 'desc' }, take: 20 } },
  });
  if (!lab) throw new AppError('Laboratório não encontrado', 404);
  return lab;
}

export async function create(data: any, userId: string, ipAddress?: string) {
  const lab = await prisma.laboratory.create({ data });

  await createAuditLog({
    userId, action: 'CREATE', entity: 'Laboratory', entityId: lab.id,
    details: { name: data.name }, ipAddress,
  });

  return lab;
}

export async function update(id: string, data: any, userId: string, ipAddress?: string) {
  const existing = await prisma.laboratory.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new AppError('Laboratório não encontrado', 404);

  const lab = await prisma.laboratory.update({ where: { id }, data });

  await createAuditLog({
    userId, action: 'UPDATE', entity: 'Laboratory', entityId: id,
    details: { changes: data }, ipAddress,
  });

  return lab;
}

export async function remove(id: string, userId: string, ipAddress?: string) {
  const existing = await prisma.laboratory.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new AppError('Laboratório não encontrado', 404);

  await prisma.laboratory.update({ where: { id }, data: { isDeleted: true } });

  await createAuditLog({
    userId, action: 'DELETE', entity: 'Laboratory', entityId: id,
    details: { name: existing.name }, ipAddress,
  });
}
