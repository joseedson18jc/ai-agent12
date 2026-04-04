import prisma from '../utils/prisma.js';
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

export async function salesReport(filters: {
  startDate: Date;
  endDate: Date;
  categoryId?: string;
  sellerId?: string;
  paymentMethod?: string;
}) {
  const where: any = {
    isDeleted: false,
    status: { not: 'CANCELLED' },
    date: { gte: startOfDay(filters.startDate), lte: endOfDay(filters.endDate) },
  };
  if (filters.sellerId) where.sellerId = filters.sellerId;

  const orders = await prisma.salesOrder.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      items: { include: { product: { include: { category: true } } } },
      payments: true,
    },
    orderBy: { date: 'desc' },
  });

  let filteredOrders = orders;

  // Filter by category if specified
  if (filters.categoryId) {
    filteredOrders = orders.filter((o) =>
      o.items.some((i) => i.product?.categoryId === filters.categoryId)
    );
  }

  // Filter by payment method if specified
  if (filters.paymentMethod) {
    filteredOrders = filteredOrders.filter((o) =>
      o.payments.some((p) => p.method === filters.paymentMethod)
    );
  }

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const totalProfit = filteredOrders.reduce((sum, o) => sum + o.estimatedProfit, 0);
  const totalDiscount = filteredOrders.reduce((sum, o) => sum + o.discountAmount, 0);

  // Group by payment method
  const byPaymentMethod: Record<string, { count: number; total: number }> = {};
  for (const order of filteredOrders) {
    for (const payment of order.payments) {
      if (!byPaymentMethod[payment.method]) {
        byPaymentMethod[payment.method] = { count: 0, total: 0 };
      }
      byPaymentMethod[payment.method].count++;
      byPaymentMethod[payment.method].total += payment.amount;
    }
  }

  // Group by seller
  const bySeller: Record<string, { name: string; count: number; total: number }> = {};
  for (const order of filteredOrders) {
    if (!bySeller[order.sellerId]) {
      bySeller[order.sellerId] = { name: order.seller.name, count: 0, total: 0 };
    }
    bySeller[order.sellerId].count++;
    bySeller[order.sellerId].total += order.total;
  }

  return {
    period: { startDate: filters.startDate, endDate: filters.endDate },
    summary: {
      totalOrders: filteredOrders.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      averageTicket: filteredOrders.length > 0
        ? Math.round((totalRevenue / filteredOrders.length) * 100) / 100
        : 0,
    },
    byPaymentMethod,
    bySeller: Object.values(bySeller),
    orders: filteredOrders,
  };
}

export async function financialReport(filters: { startDate: Date; endDate: Date }) {
  const start = startOfDay(filters.startDate);
  const end = endOfDay(filters.endDate);

  const [salesData, billsPaid, billsPending, installmentsPaid, installmentsPending] =
    await Promise.all([
      prisma.salesOrder.aggregate({
        where: { isDeleted: false, status: { not: 'CANCELLED' }, date: { gte: start, lte: end } },
        _sum: { total: true, estimatedProfit: true, discountAmount: true },
        _count: true,
      }),
      prisma.billToPay.aggregate({
        where: { isDeleted: false, status: 'PAID', paidDate: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.billToPay.aggregate({
        where: { isDeleted: false, status: { in: ['PENDING', 'OVERDUE'] }, dueDate: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.installment.aggregate({
        where: { status: 'PAID', paidDate: { gte: start, lte: end } },
        _sum: { paidAmount: true },
        _count: true,
      }),
      prisma.installment.aggregate({
        where: { status: { in: ['PENDING', 'OVERDUE'] }, dueDate: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

  const revenue = salesData._sum.total ?? 0;
  const expenses = billsPaid._sum.amount ?? 0;
  const grossProfit = salesData._sum.estimatedProfit ?? 0;
  const netResult = revenue - expenses;

  return {
    period: { startDate: filters.startDate, endDate: filters.endDate },
    dre: {
      receita_bruta: Math.round(revenue * 100) / 100,
      descontos: Math.round((salesData._sum.discountAmount ?? 0) * 100) / 100,
      receita_liquida: Math.round((revenue - (salesData._sum.discountAmount ?? 0)) * 100) / 100,
      custo_mercadoria: Math.round((revenue - grossProfit) * 100) / 100,
      lucro_bruto: Math.round(grossProfit * 100) / 100,
      despesas_operacionais: Math.round(expenses * 100) / 100,
      resultado_liquido: Math.round(netResult * 100) / 100,
    },
    cashFlow: {
      inflows: Math.round(revenue * 100) / 100,
      installmentsReceived: Math.round((installmentsPaid._sum.paidAmount ?? 0) * 100) / 100,
      outflows: Math.round(expenses * 100) / 100,
      netCashFlow: Math.round((revenue + (installmentsPaid._sum.paidAmount ?? 0) - expenses) * 100) / 100,
    },
    receivables: {
      pending: Math.round((installmentsPending._sum.amount ?? 0) * 100) / 100,
      pendingCount: installmentsPending._count,
    },
    payables: {
      pending: Math.round((billsPending._sum.amount ?? 0) * 100) / 100,
      pendingCount: billsPending._count,
    },
  };
}

export async function stockReport() {
  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    include: { category: true, supplier: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });

  const totalItems = products.reduce((sum, p) => sum + p.stock, 0);
  const totalCostValue = products.reduce((sum, p) => sum + p.totalCost * p.stock, 0);
  const totalSellingValue = products.reduce((sum, p) => sum + p.sellingPrice * p.stock, 0);
  const lowStock = products.filter((p) => p.stock <= p.minStock);
  const outOfStock = products.filter((p) => p.stock === 0);

  // Group by category
  const byCategory: Record<string, { name: string; count: number; totalStock: number; totalValue: number }> = {};
  for (const product of products) {
    const catName = product.category.name;
    if (!byCategory[catName]) {
      byCategory[catName] = { name: catName, count: 0, totalStock: 0, totalValue: 0 };
    }
    byCategory[catName].count++;
    byCategory[catName].totalStock += product.stock;
    byCategory[catName].totalValue += product.sellingPrice * product.stock;
  }

  return {
    summary: {
      totalProducts: products.length,
      totalItems,
      totalCostValue: Math.round(totalCostValue * 100) / 100,
      totalSellingValue: Math.round(totalSellingValue * 100) / 100,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
    },
    byCategory: Object.values(byCategory),
    lowStock,
    outOfStock,
    products,
  };
}

export async function customersReport(filters: { startDate: Date; endDate: Date }) {
  const start = startOfDay(filters.startDate);
  const end = endOfDay(filters.endDate);

  const [newCustomers, allCustomers] = await Promise.all([
    prisma.customer.findMany({
      where: { isDeleted: false, createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.customer.findMany({
      where: { isDeleted: false },
      include: {
        salesOrders: {
          where: { isDeleted: false, status: { not: 'CANCELLED' } },
          select: { total: true },
        },
      },
    }),
  ]);

  // Top customers by total spent
  const topCustomers = allCustomers
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      totalSpent: c.salesOrders.reduce((sum, o) => sum + o.total, 0),
      orderCount: c.salesOrders.length,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 20);

  // Debtors: customers with overdue installments
  const overdueInstallments = await prisma.installment.findMany({
    where: { status: 'OVERDUE' },
    include: {
      payment: {
        include: {
          salesOrder: {
            include: { customer: { select: { id: true, name: true, phone: true } } },
          },
        },
      },
    },
  });

  const debtorMap: Record<string, { customer: any; totalOwed: number; installments: number }> = {};
  for (const inst of overdueInstallments) {
    const cust = inst.payment.salesOrder.customer;
    if (!debtorMap[cust.id]) {
      debtorMap[cust.id] = { customer: cust, totalOwed: 0, installments: 0 };
    }
    debtorMap[cust.id].totalOwed += inst.amount;
    debtorMap[cust.id].installments++;
  }

  return {
    newCustomers: { count: newCustomers.length, customers: newCustomers },
    topCustomers,
    debtors: Object.values(debtorMap).sort((a, b) => b.totalOwed - a.totalOwed),
  };
}
