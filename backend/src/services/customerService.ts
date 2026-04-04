import prisma from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { validateCPF } from '../utils/formatters.js';
import { createAuditLog } from './auditService.js';

export async function listCustomers(filters: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where: any = { isDeleted: false };
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { cpf: { contains: filters.search } },
      { phone: { contains: filters.search } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return { customers, total, page, limit };
}

export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findFirst({
    where: { id, isDeleted: false },
    include: {
      prescriptions: {
        where: { isDeleted: false },
        orderBy: { date: 'desc' },
      },
      salesOrders: {
        where: { isDeleted: false },
        orderBy: { date: 'desc' },
        include: {
          items: { include: { product: true } },
          payments: true,
        },
      },
    },
  });
  if (!customer) throw new AppError('Cliente não encontrado', 404);
  return customer;
}

export async function createCustomer(
  data: any,
  userId: string,
  ipAddress?: string
) {
  if (data.cpf) {
    if (!validateCPF(data.cpf)) {
      throw new AppError('CPF inválido', 400);
    }
    const existing = await prisma.customer.findFirst({
      where: { cpf: data.cpf, isDeleted: false },
    });
    if (existing) {
      throw new AppError('CPF já cadastrado para outro cliente', 409);
    }
  }

  const customer = await prisma.customer.create({ data });

  await createAuditLog({
    userId,
    action: 'CREATE',
    entity: 'Customer',
    entityId: customer.id,
    details: { name: data.name, cpf: data.cpf },
    ipAddress,
  });

  return customer;
}

export async function updateCustomer(
  id: string,
  data: any,
  userId: string,
  ipAddress?: string
) {
  const existing = await prisma.customer.findFirst({
    where: { id, isDeleted: false },
  });
  if (!existing) throw new AppError('Cliente não encontrado', 404);

  if (data.cpf && data.cpf !== existing.cpf) {
    if (!validateCPF(data.cpf)) throw new AppError('CPF inválido', 400);
    const cpfTaken = await prisma.customer.findFirst({
      where: { cpf: data.cpf, isDeleted: false, id: { not: id } },
    });
    if (cpfTaken) throw new AppError('CPF já cadastrado para outro cliente', 409);
  }

  const customer = await prisma.customer.update({ where: { id }, data });

  await createAuditLog({
    userId,
    action: 'UPDATE',
    entity: 'Customer',
    entityId: id,
    details: { changes: data },
    ipAddress,
  });

  return customer;
}

export async function deleteCustomer(
  id: string,
  userId: string,
  ipAddress?: string
) {
  const existing = await prisma.customer.findFirst({
    where: { id, isDeleted: false },
  });
  if (!existing) throw new AppError('Cliente não encontrado', 404);

  await prisma.customer.update({
    where: { id },
    data: { isDeleted: true },
  });

  await createAuditLog({
    userId,
    action: 'DELETE',
    entity: 'Customer',
    entityId: id,
    details: { name: existing.name },
    ipAddress,
  });
}

export async function getBirthdaysThisMonth() {
  const now = new Date();
  const month = now.getMonth() + 1;

  const customers = await prisma.customer.findMany({
    where: {
      isDeleted: false,
      birthDate: { not: null },
    },
    orderBy: { birthDate: 'asc' },
  });

  return customers.filter((c) => {
    if (!c.birthDate) return false;
    return c.birthDate.getMonth() + 1 === month;
  });
}
