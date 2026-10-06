import prisma from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { validateCNPJ } from '../utils/formatters.js';
import { createAuditLog } from './auditService.js';

export async function list(filters: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where: any = { isDeleted: false };
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { cnpj: { contains: filters.search } },
      { contactName: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }),
    prisma.supplier.count({ where }),
  ]);

  return { suppliers, total, page, limit };
}

export async function getById(id: string) {
  const supplier = await prisma.supplier.findFirst({
    where: { id, isDeleted: false },
    include: { products: { where: { isDeleted: false } } },
  });
  if (!supplier) throw new AppError('Fornecedor não encontrado', 404);
  return supplier;
}

export async function create(data: any, userId: string, ipAddress?: string) {
  if (data.cnpj) {
    if (!validateCNPJ(data.cnpj)) throw new AppError('CNPJ inválido', 400);
    const existing = await prisma.supplier.findFirst({
      where: { cnpj: data.cnpj, isDeleted: false },
    });
    if (existing) throw new AppError('CNPJ já cadastrado', 409);
  }

  const supplier = await prisma.supplier.create({ data });

  await createAuditLog({
    userId, action: 'CREATE', entity: 'Supplier', entityId: supplier.id,
    details: { name: data.name }, ipAddress,
  });

  return supplier;
}

export async function update(id: string, data: any, userId: string, ipAddress?: string) {
  const existing = await prisma.supplier.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new AppError('Fornecedor não encontrado', 404);

  if (data.cnpj && data.cnpj !== existing.cnpj) {
    if (!validateCNPJ(data.cnpj)) throw new AppError('CNPJ inválido', 400);
    const cnpjTaken = await prisma.supplier.findFirst({
      where: { cnpj: data.cnpj, isDeleted: false, id: { not: id } },
    });
    if (cnpjTaken) throw new AppError('CNPJ já cadastrado para outro fornecedor', 409);
  }

  const supplier = await prisma.supplier.update({ where: { id }, data });

  await createAuditLog({
    userId, action: 'UPDATE', entity: 'Supplier', entityId: id,
    details: { changes: data }, ipAddress,
  });

  return supplier;
}

export async function remove(id: string, userId: string, ipAddress?: string) {
  const existing = await prisma.supplier.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new AppError('Fornecedor não encontrado', 404);

  await prisma.supplier.update({ where: { id }, data: { isDeleted: true } });

  await createAuditLog({
    userId, action: 'DELETE', entity: 'Supplier', entityId: id,
    details: { name: existing.name }, ipAddress,
  });
}
