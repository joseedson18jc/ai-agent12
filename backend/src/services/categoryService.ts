import prisma from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { createAuditLog } from './auditService.js';

export async function list() {
  return prisma.productCategory.findMany({
    where: { isDeleted: false },
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function getById(id: string) {
  const category = await prisma.productCategory.findFirst({
    where: { id, isDeleted: false },
    include: { products: { where: { isDeleted: false } } },
  });
  if (!category) throw new AppError('Categoria não encontrada', 404);
  return category;
}

export async function create(data: any, userId: string, ipAddress?: string) {
  const existing = await prisma.productCategory.findFirst({
    where: { name: data.name, isDeleted: false },
  });
  if (existing) throw new AppError('Já existe uma categoria com este nome', 409);

  const category = await prisma.productCategory.create({ data });

  await createAuditLog({
    userId, action: 'CREATE', entity: 'ProductCategory', entityId: category.id,
    details: { name: data.name }, ipAddress,
  });

  return category;
}

export async function update(id: string, data: any, userId: string, ipAddress?: string) {
  const existing = await prisma.productCategory.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new AppError('Categoria não encontrada', 404);

  if (data.name && data.name !== existing.name) {
    const nameTaken = await prisma.productCategory.findFirst({
      where: { name: data.name, isDeleted: false, id: { not: id } },
    });
    if (nameTaken) throw new AppError('Já existe uma categoria com este nome', 409);
  }

  const category = await prisma.productCategory.update({ where: { id }, data });

  await createAuditLog({
    userId, action: 'UPDATE', entity: 'ProductCategory', entityId: id,
    details: { changes: data }, ipAddress,
  });

  return category;
}

export async function remove(id: string, userId: string, ipAddress?: string) {
  const existing = await prisma.productCategory.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new AppError('Categoria não encontrada', 404);

  const hasProducts = await prisma.product.count({
    where: { categoryId: id, isDeleted: false },
  });
  if (hasProducts > 0) {
    throw new AppError('Não é possível excluir categoria com produtos vinculados', 400);
  }

  await prisma.productCategory.update({ where: { id }, data: { isDeleted: true } });

  await createAuditLog({
    userId, action: 'DELETE', entity: 'ProductCategory', entityId: id,
    details: { name: existing.name }, ipAddress,
  });
}
