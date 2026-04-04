import prisma from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { createAuditLog } from './auditService.js';

export async function list(filters: {
  status?: string;
  laboratoryId?: string;
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where: any = { isDeleted: false };
  if (filters.status) where.status = filters.status;
  if (filters.laboratoryId) where.laboratoryId = filters.laboratoryId;

  const [orders, total] = await Promise.all([
    prisma.lensOrder.findMany({
      where,
      include: {
        salesOrder: {
          include: { customer: { select: { id: true, name: true, phone: true } } },
        },
        laboratory: { select: { id: true, name: true } },
      },
      orderBy: { orderDate: 'desc' },
      skip,
      take: limit,
    }),
    prisma.lensOrder.count({ where }),
  ]);

  return { orders, total, page, limit };
}

export async function create(data: any, userId: string, ipAddress?: string) {
  const salesOrder = await prisma.salesOrder.findFirst({
    where: { id: data.salesOrderId, isDeleted: false },
  });
  if (!salesOrder) throw new AppError('Venda não encontrada', 404);

  const lab = await prisma.laboratory.findFirst({
    where: { id: data.laboratoryId, isDeleted: false },
  });
  if (!lab) throw new AppError('Laboratório não encontrado', 404);

  const order = await prisma.lensOrder.create({
    data,
    include: { laboratory: true, salesOrder: true },
  });

  await createAuditLog({
    userId, action: 'CREATE', entity: 'LensOrder', entityId: order.id,
    details: { salesOrderId: data.salesOrderId, laboratoryId: data.laboratoryId }, ipAddress,
  });

  return order;
}

export async function updateStatus(
  id: string,
  data: { status: string; receivedDate?: Date; notes?: string },
  userId: string,
  ipAddress?: string
) {
  const existing = await prisma.lensOrder.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new AppError('Pedido de lente não encontrado', 404);

  const updateData: any = { status: data.status as any };
  if (data.status === 'RECEIVED') updateData.receivedDate = data.receivedDate ?? new Date();
  if (data.notes) updateData.notes = data.notes;

  const order = await prisma.lensOrder.update({
    where: { id },
    data: updateData,
  });

  await createAuditLog({
    userId, action: 'UPDATE', entity: 'LensOrder', entityId: id,
    details: { oldStatus: existing.status, newStatus: data.status }, ipAddress,
  });

  return order;
}

export async function getPending() {
  return prisma.lensOrder.findMany({
    where: {
      isDeleted: false,
      status: { in: ['ORDERED', 'IN_PRODUCTION'] },
    },
    include: {
      salesOrder: {
        include: { customer: { select: { id: true, name: true, phone: true } } },
      },
      laboratory: { select: { id: true, name: true } },
    },
    orderBy: { expectedDelivery: 'asc' },
  });
}
