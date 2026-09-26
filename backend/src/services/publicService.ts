import prisma from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';

// Everything here is served without authentication to the public storefront.
// Only customer-facing fields may leave this file — never cost, margin,
// supplier or minimum price.

const publicProductSelect = {
  id: true,
  name: true,
  brand: true,
  model: true,
  color: true,
  size: true,
  material: true,
  photo: true,
  description: true,
  sellingPrice: true,
  stock: true,
  createdAt: true,
  category: { select: { id: true, name: true, type: true } },
} as const;

function toPublicProduct(p: any) {
  const { stock, ...rest } = p;
  return {
    ...rest,
    inStock: stock > 0,
    // Exact stock is internal; the site only needs a scarcity hint.
    lowStock: stock > 0 && stock <= 2,
  };
}

const visibleWhere = { isDeleted: false, showOnline: true, sellingPrice: { gt: 0 } };

export async function getStore() {
  const store = await prisma.store.findFirst();
  if (!store) return null;
  // Settings saves cleared fields as "", so treat blank text as "not set".
  const v = (x: string | null) => (x && x.trim() ? x.trim() : null);
  return {
    name: store.name,
    phone: v(store.phone),
    whatsapp: v(store.whatsapp),
    email: v(store.email),
    instagram: v(store.instagram),
    address: v(store.address),
    city: v(store.city),
    state: v(store.state),
    zipCode: v(store.zipCode),
    logo: v(store.logo),
    openingHours: v(store.openingHours),
    siteHeadline: v(store.siteHeadline),
  };
}

export async function listCategories() {
  const categories = await prisma.productCategory.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      name: true,
      type: true,
      _count: { select: { products: { where: { ...visibleWhere, stock: { gt: 0 } } } } },
    },
    orderBy: { name: 'asc' },
  });
  return categories.map((c) => ({ id: c.id, name: c.name, type: c.type, productCount: c._count.products }));
}

export async function listProducts(filters: {
  search?: string;
  categoryId?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  inStockOnly?: boolean;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(48, Math.max(1, filters.limit || 24));

  const where: any = { ...visibleWhere };
  if (filters.inStockOnly !== false) where.stock = { gt: 0 };
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.brand) where.brand = { equals: filters.brand, mode: 'insensitive' };
  if (filters.minPrice != null || filters.maxPrice != null) {
    where.sellingPrice = {
      gt: 0,
      ...(filters.minPrice != null ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice != null ? { lte: filters.maxPrice } : {}),
    };
  }
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { brand: { contains: filters.search, mode: 'insensitive' } },
      { model: { contains: filters.search, mode: 'insensitive' } },
      { color: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const orderBy: any =
    filters.sort === 'price_asc' ? { sellingPrice: 'asc' }
    : filters.sort === 'price_desc' ? { sellingPrice: 'desc' }
    : filters.sort === 'name' ? { name: 'asc' }
    : { createdAt: 'desc' };

  const [products, total, brandRows, priceAgg] = await Promise.all([
    prisma.product.findMany({ where, select: publicProductSelect, orderBy, skip: (page - 1) * limit, take: limit }),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where: { ...visibleWhere, stock: { gt: 0 }, brand: { not: null } },
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' },
    }),
    prisma.product.aggregate({ where: { ...visibleWhere, stock: { gt: 0 } }, _min: { sellingPrice: true }, _max: { sellingPrice: true } }),
  ]);

  return {
    products: products.map(toPublicProduct),
    total,
    page,
    limit,
    facets: {
      brands: brandRows.map((b) => b.brand).filter(Boolean) as string[],
      minPrice: priceAgg._min.sellingPrice ?? 0,
      maxPrice: priceAgg._max.sellingPrice ?? 0,
    },
  };
}

export async function getProduct(id: string) {
  const product = await prisma.product.findFirst({ where: { id, ...visibleWhere }, select: publicProductSelect });
  if (!product) throw new AppError('Produto não encontrado', 404);

  const related = await prisma.product.findMany({
    where: { ...visibleWhere, stock: { gt: 0 }, categoryId: product.category.id, id: { not: id } },
    select: publicProductSelect,
    orderBy: { createdAt: 'desc' },
    take: 4,
  });

  return { product: toPublicProduct(product), related: related.map(toPublicProduct) };
}

export async function getProductsByIds(ids: string[]) {
  const products = await prisma.product.findMany({
    where: { id: { in: ids.slice(0, 50) }, ...visibleWhere },
    select: publicProductSelect,
  });
  return products.map(toPublicProduct);
}

export async function createLead(data: {
  type: 'RESERVATION' | 'APPOINTMENT' | 'CONTACT';
  name: string;
  phone: string;
  email?: string;
  message?: string;
  preferredDate?: string;
  preferredTime?: string;
  service?: string;
  items?: { productId: string; quantity: number }[];
}) {
  let items: { productId: string; name: string; quantity: number; unitPrice: number }[] | undefined;
  let total: number | undefined;

  if (data.type === 'RESERVATION') {
    if (!data.items?.length) throw new AppError('Adicione ao menos um produto à reserva', 400);
    // Prices come from the database, never from the browser.
    const products = await prisma.product.findMany({
      where: { id: { in: data.items.map((i) => i.productId) }, ...visibleWhere },
      select: { id: true, name: true, sellingPrice: true, stock: true },
    });
    items = data.items
      .map((i) => {
        const p = products.find((x) => x.id === i.productId);
        if (!p) return null;
        return { productId: p.id, name: p.name, quantity: Math.min(i.quantity, Math.max(p.stock, 1)), unitPrice: p.sellingPrice };
      })
      .filter(Boolean) as typeof items;
    if (!items!.length) throw new AppError('Os produtos escolhidos não estão mais disponíveis', 400);
    total = Math.round(items!.reduce((s, i) => s + i.unitPrice * i.quantity, 0) * 100) / 100;
  }

  const phoneDigits = data.phone.replace(/\D/g, '');
  const customer = await prisma.customer.findFirst({
    where: {
      isDeleted: false,
      OR: [{ phone: { contains: phoneDigits.slice(-8) } }, { whatsapp: { contains: phoneDigits.slice(-8) } }],
    },
    select: { id: true },
  });

  const lead = await prisma.webLead.create({
    data: {
      type: data.type,
      name: data.name.trim(),
      phone: phoneDigits,
      email: data.email?.trim() || null,
      message: data.message?.trim() || null,
      preferredDate: data.preferredDate ? new Date(`${data.preferredDate.slice(0, 10)}T12:00:00`) : null,
      preferredTime: data.preferredTime || null,
      service: data.service || null,
      items: items as any,
      total,
      customerId: customer?.id ?? null,
    },
  });

  return { id: lead.id, type: lead.type, total: lead.total, items };
}
