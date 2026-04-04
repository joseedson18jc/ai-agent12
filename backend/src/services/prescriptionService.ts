import prisma from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { createAuditLog } from './auditService.js';

export async function list(search?: string, expiring?: boolean, expired?: boolean) {
  const where: any = { isDeleted: false };

  if (search) {
    where.OR = [
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { doctor: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (expired) {
    where.isExpired = true;
  } else if (expiring) {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    where.isExpired = false;
    where.validity = { lte: thirtyDaysFromNow, gte: now };
  }

  return prisma.prescription.findMany({
    where,
    orderBy: { date: 'desc' },
    include: { customer: { select: { id: true, name: true } } },
    take: 100,
  });
}

export async function listByCustomer(customerId: string) {
  return prisma.prescription.findMany({
    where: { customerId, isDeleted: false },
    orderBy: { date: 'desc' },
    include: { customer: { select: { id: true, name: true } } },
  });
}

export async function getById(id: string) {
  const prescription = await prisma.prescription.findFirst({
    where: { id, isDeleted: false },
    include: { customer: { select: { id: true, name: true } } },
  });
  if (!prescription) throw new AppError('Receita não encontrada', 404);
  return prescription;
}

export async function create(data: any, userId: string, ipAddress?: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: data.customerId, isDeleted: false },
  });
  if (!customer) throw new AppError('Cliente não encontrado', 404);

  const prescription = await prisma.prescription.create({ data });

  await createAuditLog({
    userId,
    action: 'CREATE',
    entity: 'Prescription',
    entityId: prescription.id,
    details: { customerId: data.customerId, doctor: data.doctor },
    ipAddress,
  });

  return prescription;
}

export async function update(id: string, data: any, userId: string, ipAddress?: string) {
  const existing = await prisma.prescription.findFirst({
    where: { id, isDeleted: false },
  });
  if (!existing) throw new AppError('Receita não encontrada', 404);

  const prescription = await prisma.prescription.update({ where: { id }, data });

  await createAuditLog({
    userId,
    action: 'UPDATE',
    entity: 'Prescription',
    entityId: id,
    details: { changes: data },
    ipAddress,
  });

  return prescription;
}

export async function remove(id: string, userId: string, ipAddress?: string) {
  const existing = await prisma.prescription.findFirst({
    where: { id, isDeleted: false },
  });
  if (!existing) throw new AppError('Receita não encontrada', 404);

  await prisma.prescription.update({
    where: { id },
    data: { isDeleted: true },
  });

  await createAuditLog({
    userId,
    action: 'DELETE',
    entity: 'Prescription',
    entityId: id,
    ipAddress,
  });
}
