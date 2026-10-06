import prisma from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { createAuditLog } from './auditService.js';
import { startOfDay, endOfDay } from 'date-fns';

export async function openRegister(
  data: { openingBalance: number; notes?: string },
  userId: string,
  ipAddress?: string
) {
  const today = new Date();
  const existingOpen = await prisma.cashRegister.findFirst({
    where: {
      date: { gte: startOfDay(today), lte: endOfDay(today) },
      isClosed: false,
    },
  });
  if (existingOpen) throw new AppError('Já existe um caixa aberto hoje', 400);

  const register = await prisma.cashRegister.create({
    data: {
      openingBalance: data.openingBalance,
      userId,
      notes: data.notes,
    },
  });

  // Create opening movement
  await prisma.cashMovement.create({
    data: {
      cashRegisterId: register.id,
      type: 'OPENING',
      amount: data.openingBalance,
      description: 'Abertura de caixa',
    },
  });

  await createAuditLog({
    userId, action: 'OPEN', entity: 'CashRegister', entityId: register.id,
    details: { openingBalance: data.openingBalance }, ipAddress,
  });

  return register;
}

export async function closeRegister(
  id: string,
  data: { reportedBalance: number; notes?: string },
  userId: string,
  ipAddress?: string
) {
  const register = await prisma.cashRegister.findUnique({
    where: { id },
    include: { movements: true },
  });
  if (!register) throw new AppError('Caixa não encontrado', 404);
  if (register.isClosed) throw new AppError('Caixa já está fechado', 400);

  // Calculate closing balance from movements
  const closingBalance = register.movements.reduce((sum, mov) => {
    if (mov.type === 'INFLOW' || mov.type === 'OPENING' || mov.type === 'SUPPLEMENT') {
      return sum + mov.amount;
    }
    return sum - mov.amount;
  }, 0);

  const difference = data.reportedBalance - closingBalance;

  const updated = await prisma.cashRegister.update({
    where: { id },
    data: {
      isClosed: true,
      closingBalance,
      reportedBalance: data.reportedBalance,
      difference,
      notes: data.notes,
    },
  });

  await createAuditLog({
    userId, action: 'CLOSE', entity: 'CashRegister', entityId: id,
    details: { closingBalance, reportedBalance: data.reportedBalance, difference },
    ipAddress,
  });

  return updated;
}

export async function addMovement(
  data: {
    cashRegisterId: string;
    type: string;
    amount: number;
    description?: string;
    salesOrderId?: string;
    billToPayId?: string;
  },
  userId: string,
  ipAddress?: string
) {
  const register = await prisma.cashRegister.findUnique({
    where: { id: data.cashRegisterId },
  });
  if (!register) throw new AppError('Caixa não encontrado', 404);
  if (register.isClosed) throw new AppError('Caixa está fechado', 400);

  const movement = await prisma.cashMovement.create({
    data: {
      cashRegisterId: data.cashRegisterId,
      type: data.type as any,
      amount: data.amount,
      description: data.description,
      salesOrderId: data.salesOrderId,
      billToPayId: data.billToPayId,
    },
  });

  await createAuditLog({
    userId, action: 'CREATE', entity: 'CashMovement', entityId: movement.id,
    details: { type: data.type, amount: data.amount }, ipAddress,
  });

  return movement;
}

export async function getCurrent() {
  const today = new Date();
  const register = await prisma.cashRegister.findFirst({
    where: {
      date: { gte: startOfDay(today), lte: endOfDay(today) },
      isClosed: false,
    },
    include: { movements: true, user: { select: { id: true, name: true } } },
  });
  return register;
}

export async function getHistory(filters: {
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (filters.startDate || filters.endDate) {
    where.date = {};
    if (filters.startDate) where.date.gte = filters.startDate;
    if (filters.endDate) where.date.lte = filters.endDate;
  }

  const [registers, total] = await Promise.all([
    prisma.cashRegister.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        movements: true,
      },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    }),
    prisma.cashRegister.count({ where }),
  ]);

  return { registers, total, page, limit };
}
