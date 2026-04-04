import prisma from '../utils/prisma.js';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, format } from 'date-fns';

export async function getKpis() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [todaySales, monthSales, lowStockProducts, upcomingBills, overdueInstallments] =
    await Promise.all([
      prisma.salesOrder.aggregate({
        where: {
          isDeleted: false,
          status: { not: 'CANCELLED' },
          date: { gte: todayStart, lte: todayEnd },
        },
        _sum: { total: true },
        _count: true,
      }),
      prisma.salesOrder.aggregate({
        where: {
          isDeleted: false,
          status: { not: 'CANCELLED' },
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { total: true, estimatedProfit: true },
        _count: true,
      }),
      prisma.product.findMany({ where: { isDeleted: false } }),
      prisma.billToPay.count({
        where: {
          isDeleted: false,
          status: 'PENDING',
          dueDate: { lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.installment.count({ where: { status: 'OVERDUE' } }),
    ]);

  const lowStockCount = lowStockProducts.filter((p) => p.stock <= p.minStock).length;
  const monthCount = monthSales._count;
  const ticketAvg = monthCount > 0 ? (monthSales._sum.total ?? 0) / monthCount : 0;

  return {
    todaySales: todaySales._sum.total ?? 0,
    todaySalesCount: todaySales._count,
    monthSales: monthSales._sum.total ?? 0,
    monthSalesCount: monthCount,
    monthProfit: monthSales._sum.estimatedProfit ?? 0,
    ticketAvg: Math.round(ticketAvg * 100) / 100,
    lowStockCount,
    upcomingBills,
    overdueInstallments,
  };
}

export async function getSalesChart(filters: { groupBy?: string; days?: number }) {
  const days = filters.days ?? 30;
  const startDate = subDays(new Date(), days);

  const orders = await prisma.salesOrder.findMany({
    where: {
      isDeleted: false,
      status: { not: 'CANCELLED' },
      date: { gte: startDate },
    },
    select: { date: true, total: true },
    orderBy: { date: 'asc' },
  });

  const groupBy = filters.groupBy ?? 'day';
  const grouped: Record<string, { total: number; count: number }> = {};

  for (const order of orders) {
    let key: string;
    if (groupBy === 'week') {
      const weekStart = new Date(order.date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      key = format(weekStart, 'yyyy-MM-dd');
    } else if (groupBy === 'month') {
      key = format(order.date, 'yyyy-MM');
    } else {
      key = format(order.date, 'yyyy-MM-dd');
    }

    if (!grouped[key]) grouped[key] = { total: 0, count: 0 };
    grouped[key].total += order.total;
    grouped[key].count++;
  }

  return Object.entries(grouped).map(([date, data]) => ({
    date,
    total: Math.round(data.total * 100) / 100,
    count: data.count,
  }));
}

export async function getTopProducts() {
  const monthStart = startOfMonth(new Date());

  const items = await prisma.salesOrderItem.findMany({
    where: {
      salesOrder: {
        isDeleted: false,
        status: { not: 'CANCELLED' },
        date: { gte: monthStart },
      },
      productId: { not: null },
    },
    include: { product: { select: { id: true, name: true, brand: true } } },
  });

  const productMap: Record<string, { product: any; quantity: number; revenue: number }> = {};
  for (const item of items) {
    if (!item.productId || !item.product) continue;
    if (!productMap[item.productId]) {
      productMap[item.productId] = { product: item.product, quantity: 0, revenue: 0 };
    }
    productMap[item.productId].quantity += item.quantity;
    productMap[item.productId].revenue += item.subtotal;
  }

  return Object.values(productMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
}

export async function getRecentSales() {
  return prisma.salesOrder.findMany({
    where: { isDeleted: false },
    include: {
      customer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
    take: 5,
  });
}

export async function getUpcomingReminders() {
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [upcomingBills, overdueInstallments] = await Promise.all([
    prisma.billToPay.findMany({
      where: {
        isDeleted: false,
        status: 'PENDING',
        dueDate: { gte: now, lte: sevenDays },
      },
      include: { category: true },
      orderBy: { dueDate: 'asc' },
      take: 10,
    }),
    prisma.installment.findMany({
      where: { status: 'OVERDUE' },
      include: {
        payment: {
          include: {
            salesOrder: {
              include: { customer: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    }),
  ]);

  return { upcomingBills, overdueInstallments };
}
