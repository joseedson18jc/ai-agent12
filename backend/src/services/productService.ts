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
  // A selling price of 0 means "not informed" — fall back to the suggested price.
  const sellingPrice = data.sellingPrice && data.sellingPrice > 0 ? data.sellingPrice : suggestedPrice;
  const minimumPrice = data.minimumPrice ?? totalCost * 1.1;
  const profitAmount = sellingPrice - totalCost;
  // Guard against division by zero: -Infinity/NaN makes Prisma reject the whole write.
  const marginPercent = sellingPrice > 0 ? ((sellingPrice - totalCost) / sellingPrice) * 100 : 0;

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    suggestedPrice: Math.round(suggestedPrice * 100) / 100,
    sellingPrice: Math.round(sellingPrice * 100) / 100,
    minimumPrice: Math.round(minimumPrice * 100) / 100,
    profitAmount: Math.round(profitAmount * 100) / 100,
    marginPercent: Math.round(marginPercent * 100) / 100,
  };
}

export type StockFilter = 'in_stock' | 'low' | 'out';
export type ProductSort = 'name' | 'recent' | 'stock' | 'margin' | 'price';

export async function list(filters: {
  search?: string;
  categoryId?: string;
  brand?: string;
  stock?: StockFilter;
  sort?: ProductSort;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(200, Math.max(1, filters.limit || 20));
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
  if (filters.stock === 'out') where.stock = { lte: 0 };
  if (filters.stock === 'in_stock') where.stock = { gt: 0 };
  if (filters.stock === 'low') {
    where.AND = [{ stock: { gt: 0 } }, { stock: { lte: prisma.product.fields.minStock } }];
  }

  const orderBy: any =
    filters.sort === 'recent' ? [{ createdAt: 'desc' }]
    : filters.sort === 'stock' ? [{ stock: 'asc' }, { name: 'asc' }]
    : filters.sort === 'margin' ? [{ marginPercent: 'desc' }, { name: 'asc' }]
    : filters.sort === 'price' ? [{ sellingPrice: 'desc' }, { name: 'asc' }]
    : [{ name: 'asc' }];

  const [products, total, all] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, supplier: { select: { id: true, name: true } } },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
    // Lightweight catalogue-wide figures for the KPI tiles and brand filter
    prisma.product.findMany({
      where: { isDeleted: false },
      select: { stock: true, minStock: true, totalCost: true, sellingPrice: true, minimumPrice: true, marginPercent: true, brand: true },
    }),
  ]);

  const summary = {
    products: all.length,
    units: 0,
    costValue: 0,
    saleValue: 0,
    lowStock: 0,
    outOfStock: 0,
    avgMargin: 0,
    belowMinimum: 0,
    lowMargin: 0,
    brands: [] as string[],
  };
  const brands = new Set<string>();
  let marginSum = 0;
  let priced = 0;
  for (const p of all) {
    const units = Math.max(0, p.stock);
    summary.units += units;
    summary.costValue += units * p.totalCost;
    summary.saleValue += units * p.sellingPrice;
    if (p.stock <= 0) summary.outOfStock++;
    else if (p.stock <= p.minStock) summary.lowStock++;
    if (p.sellingPrice > 0 && Number.isFinite(p.marginPercent)) {
      marginSum += p.marginPercent;
      priced++;
      if (p.marginPercent < 20) summary.lowMargin++;
    }
    if (p.sellingPrice > 0 && p.minimumPrice > 0 && p.sellingPrice < p.minimumPrice) summary.belowMinimum++;
    if (p.brand?.trim()) brands.add(p.brand.trim());
  }
  summary.costValue = Math.round(summary.costValue * 100) / 100;
  summary.saleValue = Math.round(summary.saleValue * 100) / 100;
  summary.avgMargin = priced ? Math.round((marginSum / priced) * 10) / 10 : 0;
  summary.brands = [...brands].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  return { products, total, page, limit, summary };
}

export async function getById(id: string) {
  const product = await prisma.product.findFirst({
    where: { id, isDeleted: false },
    include: { category: true, supplier: true },
  });
  if (!product) throw new AppError('Produto não encontrado', 404);
  return product;
}

/**
 * barcode is @unique in the DB, including soft-deleted rows. Release the code from
 * deleted products and return a friendly 409 instead of a Prisma P2002 (HTTP 500).
 */
async function ensureBarcodeAvailable(barcode: string | null | undefined, exceptId?: string) {
  if (!barcode) return;
  const owner = await prisma.product.findFirst({ where: { barcode } });
  if (!owner || owner.id === exceptId) return;
  if (owner.isDeleted) {
    await prisma.product.update({ where: { id: owner.id }, data: { barcode: null } });
    return;
  }
  throw new AppError(`Código de barras/SKU já usado pelo produto "${owner.name}"`, 409);
}

export async function create(data: any, userId: string, ipAddress?: string) {
  const pricing = calculatePricing(data);
  await ensureBarcodeAvailable(data.barcode);

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
  await ensureBarcodeAvailable(data.barcode, id);

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
