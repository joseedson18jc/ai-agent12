import prisma from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { createAuditLog } from './auditService.js';
import { addDays } from 'date-fns';

export async function list(filters: {
  status?: string;
  categoryId?: string;
  supplierId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where: any = { isDeleted: false };
  if (filters.status) where.status = filters.status;
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.supplierId) where.supplierId = filters.supplierId;
  if (filters.startDate || filters.endDate) {
    where.dueDate = {};
    if (filters.startDate) where.dueDate.gte = filters.startDate;
    if (filters.endDate) where.dueDate.lte = filters.endDate;
  }

  const [bills, total] = await Promise.all([
    prisma.billToPay.findMany({
      where,
      include: {
        category: true,
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
      skip,
      take: limit,
    }),
    prisma.billToPay.count({ where }),
  ]);

  return { bills, total, page, limit };
}

export async function getById(id: string) {
  const bill = await prisma.billToPay.findFirst({
    where: { id, isDeleted: false },
    include: { category: true, supplier: true, childBills: true },
  });
  if (!bill) throw new AppError('Conta não encontrada', 404);
  return bill;
}

export async function create(data: any, userId: string, ipAddress?: string) {
  const bill = await prisma.billToPay.create({
    data,
    include: { category: true },
  });

  await createAuditLog({
    userId, action: 'CREATE', entity: 'BillToPay', entityId: bill.id,
    details: { description: data.description, amount: data.amount }, ipAddress,
  });

  return bill;
}

export async function update(id: string, data: any, userId: string, ipAddress?: string) {
  const existing = await prisma.billToPay.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new AppError('Conta não encontrada', 404);

  const bill = await prisma.billToPay.update({
    where: { id },
    data,
    include: { category: true },
  });

  await createAuditLog({
    userId, action: 'UPDATE', entity: 'BillToPay', entityId: id,
    details: { changes: data }, ipAddress,
  });

  return bill;
}

export async function remove(id: string, userId: string, ipAddress?: string) {
  const existing = await prisma.billToPay.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new AppError('Conta não encontrada', 404);

  await prisma.billToPay.update({ where: { id }, data: { isDeleted: true } });

  await createAuditLog({
    userId, action: 'DELETE', entity: 'BillToPay', entityId: id,
    details: { description: existing.description }, ipAddress,
  });
}

export async function getUpcoming() {
  const now = new Date();
  const sevenDaysFromNow = addDays(now, 7);

  return prisma.billToPay.findMany({
    where: {
      isDeleted: false,
      status: 'PENDING',
      dueDate: { gte: now, lte: sevenDaysFromNow },
    },
    include: { category: true, supplier: { select: { id: true, name: true } } },
    orderBy: { dueDate: 'asc' },
  });
}

export async function getOverdue() {
  return prisma.billToPay.findMany({
    where: {
      isDeleted: false,
      status: 'OVERDUE',
    },
    include: { category: true, supplier: { select: { id: true, name: true } } },
    orderBy: { dueDate: 'asc' },
  });
}

export async function payBill(
  id: string,
  data: { paymentMethod: string; receipt?: string },
  userId: string,
  ipAddress?: string
) {
  const bill = await prisma.billToPay.findFirst({ where: { id, isDeleted: false } });
  if (!bill) throw new AppError('Conta não encontrada', 404);
  if (bill.status === 'PAID') throw new AppError('Conta já está paga', 400);

  const updated = await prisma.billToPay.update({
    where: { id },
    data: {
      status: 'PAID',
      paidDate: new Date(),
      paymentMethod: data.paymentMethod as any,
      receipt: data.receipt,
    },
  });

  await createAuditLog({
    userId, action: 'PAY', entity: 'BillToPay', entityId: id,
    details: { amount: bill.amount, paymentMethod: data.paymentMethod }, ipAddress,
  });

  return updated;
}
