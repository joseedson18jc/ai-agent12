import prisma from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { createAuditLog } from './auditService.js';

export async function list() {
  return prisma.billCategory.findMany({
    where: { isDeleted: false },
    include: { _count: { select: { bills: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function getById(id: string) {
  const category = await prisma.billCategory.findFirst({
    where: { id, isDeleted: false },
  });
  if (!category) throw new AppError('Categoria de conta não encontrada', 404);
  return category;
}

export async function create(data: { name: string }, userId: string, ipAddress?: string) {
  const existing = await prisma.billCategory.findFirst({
    where: { name: data.name, isDeleted: false },
  });
  if (existing) throw new AppError('Já existe uma categoria com este nome', 409);

  const category = await prisma.billCategory.create({ data });

  await createAuditLog({
    userId, action: 'CREATE', entity: 'BillCategory', entityId: category.id,
    details: { name: data.name }, ipAddress,
  });

  return category;
}

export async function update(id: string, data: { name?: string }, userId: string, ipAddress?: string) {
  const existing = await prisma.billCategory.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new AppError('Categoria de conta não encontrada', 404);

  const category = await prisma.billCategory.update({ where: { id }, data });

  await createAuditLog({
    userId, action: 'UPDATE', entity: 'BillCategory', entityId: id,
    details: { changes: data }, ipAddress,
  });

  return category;
}

export async function remove(id: string, userId: string, ipAddress?: string) {
  const existing = await prisma.billCategory.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new AppError('Categoria de conta não encontrada', 404);

  const hasBills = await prisma.billToPay.count({
    where: { categoryId: id, isDeleted: false },
  });
  if (hasBills > 0) {
    throw new AppError('Não é possível excluir categoria com contas vinculadas', 400);
  }

  await prisma.billCategory.update({ where: { id }, data: { isDeleted: true } });

  await createAuditLog({
    userId, action: 'DELETE', entity: 'BillCategory', entityId: id,
    details: { name: existing.name }, ipAddress,
  });
}
