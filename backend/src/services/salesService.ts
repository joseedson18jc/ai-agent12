import prisma from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { createAuditLog } from './auditService.js';

export async function list(filters: {
  status?: string;
  customerId?: string;
  sellerId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where: any = { isDeleted: false };
  if (filters.status) where.status = filters.status;
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.sellerId) where.sellerId = filters.sellerId;
  if (filters.startDate || filters.endDate) {
    where.date = {};
    if (filters.startDate) where.date.gte = filters.startDate;
    if (filters.endDate) where.date.lte = filters.endDate;
  }

  const [orders, total] = await Promise.all([
    prisma.salesOrder.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        seller: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
        payments: true,
      },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    }),
    prisma.salesOrder.count({ where }),
  ]);

  return { orders, total, page, limit };
}

export async function getById(id: string) {
  const order = await prisma.salesOrder.findFirst({
    where: { id, isDeleted: false },
    include: {
      customer: true,
      seller: { select: { id: true, name: true } },
      prescription: true,
      items: { include: { product: true } },
      payments: { include: { installments: true } },
      lensOrders: { include: { laboratory: true } },
    },
  });
  if (!order) throw new AppError('Venda não encontrada', 404);
  return order;
}

interface CreateOrderItem {
  productId?: string;
  description?: string;
  unitPrice: number;
  quantity: number;
  discountPercent?: number;
  discountAmount?: number;
}

interface CreateOrderPayment {
  method: string;
  amount: number;
  cardBrand?: string;
  cardInstallments?: number;
  interestRate?: number;
  justification?: string;
  installmentCount?: number;
}

export async function create(
  data: {
    customerId: string;
    prescriptionId?: string;
    sellerId: string;
    discountPercent?: number;
    discountAmount?: number;
    notes?: string;
    items: CreateOrderItem[];
    payments: CreateOrderPayment[];
  },
  userId: string,
  userRole: string,
  ipAddress?: string
) {
  // Validate customer
  const customer = await prisma.customer.findFirst({
    where: { id: data.customerId, isDeleted: false },
  });
  if (!customer) throw new AppError('Cliente não encontrado', 404);

  // Validate and prepare items
  let subtotal = 0;
  let estimatedProfit = 0;
  const itemsData: any[] = [];

  for (const item of data.items) {
    let costPrice = 0;
    if (item.productId) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, isDeleted: false },
      });
      if (!product) throw new AppError(`Produto não encontrado: ${item.productId}`, 404);

      // Check stock
      if (product.stock < item.quantity) {
        throw new AppError(`Estoque insuficiente para ${product.name}. Disponível: ${product.stock}`, 400);
      }

      // Block if below minimum price (unless admin with justification)
      if (item.unitPrice < product.minimumPrice) {
        if (userRole !== 'ADMIN') {
          throw new AppError(
            `Preço de ${product.name} (R$ ${item.unitPrice.toFixed(2)}) está abaixo do mínimo permitido (R$ ${product.minimumPrice.toFixed(2)}). Apenas administradores podem autorizar.`,
            403
          );
        }
        await createAuditLog({
          userId,
          action: 'FORCE_SELL_BELOW_MIN',
          entity: 'Product',
          entityId: product.id,
          details: {
            productName: product.name,
            minimumPrice: product.minimumPrice,
            soldPrice: item.unitPrice,
          },
          ipAddress,
        });
      }

      costPrice = product.totalCost;
    }

    const itemDiscountAmount = item.discountAmount ?? (item.discountPercent ? (item.unitPrice * item.quantity * item.discountPercent) / 100 : 0);
    const itemSubtotal = item.unitPrice * item.quantity - itemDiscountAmount;

    subtotal += itemSubtotal;
    estimatedProfit += itemSubtotal - costPrice * item.quantity;

    itemsData.push({
      productId: item.productId,
      description: item.description,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      discountPercent: item.discountPercent,
      discountAmount: itemDiscountAmount,
      subtotal: itemSubtotal,
      costPrice,
    });
  }

  const orderDiscountAmount = data.discountAmount ?? (data.discountPercent ? (subtotal * data.discountPercent) / 100 : 0);
  const total = subtotal - orderDiscountAmount;

  // Validate payments total
  const paymentsTotal = data.payments.reduce((sum, p) => sum + p.amount, 0);
  if (Math.abs(paymentsTotal - total) > 0.01) {
    throw new AppError(
      `Total dos pagamentos (R$ ${paymentsTotal.toFixed(2)}) difere do total da venda (R$ ${total.toFixed(2)})`,
      400
    );
  }

  // Create order in transaction
  const order = await prisma.$transaction(async (tx) => {
    const salesOrder = await tx.salesOrder.create({
      data: {
        customerId: data.customerId,
        prescriptionId: data.prescriptionId,
        sellerId: data.sellerId,
        subtotal,
        discountPercent: data.discountPercent,
        discountAmount: orderDiscountAmount,
        total,
        estimatedProfit,
        notes: data.notes,
        items: { create: itemsData },
      },
      include: { items: true },
    });

    // Decrement stock
    for (const item of data.items) {
      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    // Create payments
    for (const payment of data.payments) {
      const createdPayment = await tx.payment.create({
        data: {
          salesOrderId: salesOrder.id,
          method: payment.method as any,
          amount: payment.amount,
          cardBrand: payment.cardBrand,
          cardInstallments: payment.cardInstallments,
          interestRate: payment.interestRate,
          justification: payment.justification,
        },
      });

      // Auto-generate installments for STORE_CREDIT
      if (payment.method === 'STORE_CREDIT' && payment.installmentCount) {
        const installmentAmount = payment.amount / payment.installmentCount;
        const now = new Date();
        for (let i = 1; i <= payment.installmentCount; i++) {
          const dueDate = new Date(now);
          dueDate.setMonth(dueDate.getMonth() + i);
          await tx.installment.create({
            data: {
              paymentId: createdPayment.id,
              number: i,
              amount: Math.round(installmentAmount * 100) / 100,
              dueDate,
            },
          });
        }
      }
    }

    return salesOrder;
  });

  await createAuditLog({
    userId,
    action: 'CREATE',
    entity: 'SalesOrder',
    entityId: order.id,
    details: { customerId: data.customerId, total, itemCount: data.items.length },
    ipAddress,
  });

  return getById(order.id);
}

export async function updateStatus(
  id: string,
  status: string,
  userId: string,
  ipAddress?: string
) {
  const order = await prisma.salesOrder.findFirst({ where: { id, isDeleted: false } });
  if (!order) throw new AppError('Venda não encontrada', 404);

  const updated = await prisma.salesOrder.update({
    where: { id },
    data: { status: status as any },
  });

  await createAuditLog({
    userId,
    action: 'UPDATE',
    entity: 'SalesOrder',
    entityId: id,
    details: { oldStatus: order.status, newStatus: status },
    ipAddress,
  });

  return updated;
}

export async function cancelOrder(
  id: string,
  reason: string,
  userId: string,
  ipAddress?: string
) {
  if (!reason || reason.trim().length === 0) {
    throw new AppError('Motivo do cancelamento é obrigatório', 400);
  }

  const order = await prisma.salesOrder.findFirst({
    where: { id, isDeleted: false },
    include: { items: true },
  });
  if (!order) throw new AppError('Venda não encontrada', 404);
  if (order.status === 'CANCELLED') throw new AppError('Venda já está cancelada', 400);

  await prisma.$transaction(async (tx) => {
    await tx.salesOrder.update({
      where: { id },
      data: { status: 'CANCELLED', cancelReason: reason },
    });

    // Restore stock
    for (const item of order.items) {
      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
  });

  await createAuditLog({
    userId,
    action: 'CANCEL',
    entity: 'SalesOrder',
    entityId: id,
    details: { reason, total: order.total },
    ipAddress,
  });
}

export async function getPending() {
  return prisma.salesOrder.findMany({
    where: {
      isDeleted: false,
      status: { notIn: ['DELIVERED', 'CANCELLED'] },
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      seller: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true } } } },
    },
    orderBy: { date: 'asc' },
  });
}
