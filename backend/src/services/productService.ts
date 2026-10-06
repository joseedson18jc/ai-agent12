import prisma from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { createAuditLog } from './auditService.js';

function calculatePricing(data: {
  costPrice: number;
  taxFreight?: number;
  desiredMarkup?: number;
  sellingPrice?: number;
  minimumPrice?: number;
}) {
  const costPrice = data.costPrice;
  const taxFreight = data.taxFreight ?? 0;
  const totalCost = costPrice + taxFreight;
  const desiredMarkup = data.desiredMarkup ?? 100;
  const suggestedPrice = totalCost * (1 + desiredMarkup / 100);
  const sellingPrice = data.sellingPrice ?? suggestedPrice;
  const minimumPrice = data.minimumPrice ?? totalCost * 1.1;
  const profitAmount = sellingPrice - totalCost;
  const marginPercent = totalCost > 0 ? ((sellingPrice - totalCost) / sellingPrice) * 100 : 0;

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    suggestedPrice: Math.round(suggestedPrice * 100) / 100,
    sellingPrice: Math.round(sellingPrice * 100) / 100,
    minimumPrice: Math.round(minimumPrice * 100) / 100,
    profitAmount: Math.round(profitAmount * 100) / 100,
    marginPercent: Math.round(marginPercent * 100) / 100,
  };
}

export async function list(filters: {
  search?: string;
  categoryId?: string;
  brand?: string;
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where: any = { isDeleted: false };
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.brand) where.brand = { contains: filters.brand, mode: 'insensitive' };
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { brand: { contains: filters.search, mode: 'insensitive' } },
      { model: { contains: filters.search, mode: 'insensitive' } },
      { barcode: { contains: filters.search } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, supplier: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total, page, limit };
}

export async function getById(id: string) {
  const product = await prisma.product.findFirst({
    where: { id, isDeleted: false },
    include: { category: true, supplier: true },
  });
  if (!product) throw new AppError('Produto não encontrado', 404);
  return product;
}

export async function create(data: any, userId: string, ipAddress?: string) {
  const pricing = calculatePricing(data);

  const product = await prisma.product.create({
    data: {
      ...data,
      ...pricing,
    },
    include: { category: true },
  });

  await createAuditLog({
    userId, action: 'CREATE', entity: 'Product', entityId: product.id,
    details: { name: data.name, sellingPrice: pricing.sellingPrice }, ipAddress,
  });

  return product;
}

export async function update(id: string, data: any, userId: string, ipAddress?: string) {
  const existing = await prisma.product.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new AppError('Produto não encontrado', 404);

  const mergedPricing = {
    costPrice: data.costPrice ?? existing.costPrice,
    taxFreight: data.taxFreight ?? existing.taxFreight,
    desiredMarkup: data.desiredMarkup ?? existing.desiredMarkup,
    sellingPrice: data.sellingPrice ?? existing.sellingPrice,
    minimumPrice: data.minimumPrice,
  };

  const pricing = calculatePricing(mergedPricing);

  const product = await prisma.product.update({
    where: { id },
    data: { ...data, ...pricing },
    include: { category: true },
  });

  await createAuditLog({
    userId, action: 'UPDATE', entity: 'Product', entityId: id,
    details: { changes: data }, ipAddress,
  });

  return product;
}

export async function remove(id: string, userId: string, ipAddress?: string) {
  const existing = await prisma.product.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new AppError('Produto não encontrado', 404);

  await prisma.product.update({ where: { id }, data: { isDeleted: true } });

  await createAuditLog({
    userId, action: 'DELETE', entity: 'Product', entityId: id,
    details: { name: existing.name }, ipAddress,
  });
}

export async function getLowStock() {
  return prisma.product.findMany({
    where: {
      isDeleted: false,
      stock: { lte: prisma.product.fields.minStock as any },
    },
    include: { category: true },
    orderBy: { stock: 'asc' },
  });
}

export async function getLowStockProducts() {
  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    include: { category: true },
  });
  return products.filter((p) => p.stock <= p.minStock);
}

export async function validatePrice(productId: string, price: number) {
  const product = await prisma.product.findFirst({
    where: { id: productId, isDeleted: false },
  });
  if (!product) throw new AppError('Produto não encontrado', 404);

  return {
    valid: price >= product.minimumPrice,
    minimumPrice: product.minimumPrice,
    sellingPrice: product.sellingPrice,
    requestedPrice: price,
    difference: price - product.minimumPrice,
  };
}
