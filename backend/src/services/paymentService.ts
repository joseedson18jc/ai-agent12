import prisma from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { createAuditLog } from './auditService.js';

export async function createPayment(
  data: {
    salesOrderId: string;
    method: string;
    amount: number;
    cardBrand?: string;
    cardInstallments?: number;
    interestRate?: number;
    justification?: string;
    installmentCount?: number;
  },
  userId: string,
  ipAddress?: string
) {
  const order = await prisma.salesOrder.findFirst({
    where: { id: data.salesOrderId, isDeleted: false },
  });
  if (!order) throw new AppError('Venda não encontrada', 404);

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        salesOrderId: data.salesOrderId,
        method: data.method as any,
        amount: data.amount,
        cardBrand: data.cardBrand,
        cardInstallments: data.cardInstallments,
        interestRate: data.interestRate,
        justification: data.justification,
      },
    });

    if (data.method === 'STORE_CREDIT' && data.installmentCount) {
      const installmentAmount = data.amount / data.installmentCount;
      const now = new Date();
      for (let i = 1; i <= data.installmentCount; i++) {
        const dueDate = new Date(now);
        dueDate.setMonth(dueDate.getMonth() + i);
        await tx.installment.create({
          data: {
            paymentId: created.id,
            number: i,
            amount: Math.round(installmentAmount * 100) / 100,
            dueDate,
          },
        });
      }
    }

    return created;
  });

  await createAuditLog({
    userId, action: 'CREATE', entity: 'Payment', entityId: payment.id,
    details: { salesOrderId: data.salesOrderId, method: data.method, amount: data.amount },
    ipAddress,
  });

  return prisma.payment.findUnique({
    where: { id: payment.id },
    include: { installments: true },
  });
}

export async function listReceivables(filters: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 50 } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (filters.status) where.status = filters.status;

  const [installments, total] = await Promise.all([
    prisma.installment.findMany({
      where,
      include: {
        payment: {
          include: {
            salesOrder: {
              include: {
                customer: { select: { id: true, name: true, phone: true } },
              },
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      skip,
      take: limit,
    }),
    prisma.installment.count({ where }),
  ]);

  return { installments, total, page, limit };
}

export async function payInstallment(
  id: string,
  data: { paidAmount: number; paymentMethod?: string; notes?: string },
  userId: string,
  ipAddress?: string
) {
  const installment = await prisma.installment.findUnique({ where: { id } });
  if (!installment) throw new AppError('Parcela não encontrada', 404);
  if (installment.status === 'PAID') throw new AppError('Parcela já foi paga', 400);

  const updated = await prisma.installment.update({
    where: { id },
    data: {
      status: 'PAID',
      paidDate: new Date(),
      paidAmount: data.paidAmount,
      paymentMethod: data.paymentMethod as any,
      notes: data.notes,
    },
  });

  await createAuditLog({
    userId, action: 'PAY', entity: 'Installment', entityId: id,
    details: { amount: data.paidAmount, paymentMethod: data.paymentMethod },
    ipAddress,
  });

  return updated;
}
