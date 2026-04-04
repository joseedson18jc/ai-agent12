import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { createAuditLog } from './auditService.js';

export async function list(filters: { page?: number; limit?: number }) {
  const { page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLogin: true, createdAt: true },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.user.count(),
  ]);

  return { users, total, page, limit };
}

export async function getById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, isActive: true, lastLogin: true, createdAt: true },
  });
  if (!user) throw new AppError('Usuário não encontrado', 404);
  return user;
}

export async function create(
  data: { name: string; email: string; password: string; role: string },
  performedBy: string,
  ipAddress?: string
) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError('E-mail já cadastrado', 409);

  const hashedPassword = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role as any,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  await createAuditLog({
    userId: performedBy, action: 'CREATE', entity: 'User', entityId: user.id,
    details: { name: data.name, email: data.email, role: data.role }, ipAddress,
  });

  return user;
}

export async function update(
  id: string,
  data: { name?: string; email?: string; password?: string; role?: string; isActive?: boolean },
  performedBy: string,
  ipAddress?: string
) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new AppError('Usuário não encontrado', 404);

  if (data.email && data.email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
    if (emailTaken) throw new AppError('E-mail já cadastrado para outro usuário', 409);
  }

  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.email) updateData.email = data.email;
  if (data.role) updateData.role = data.role;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.password) updateData.password = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  await createAuditLog({
    userId: performedBy, action: 'UPDATE', entity: 'User', entityId: id,
    details: { changes: { ...data, password: data.password ? '[REDACTED]' : undefined } }, ipAddress,
  });

  return user;
}

export async function remove(id: string, performedBy: string, ipAddress?: string) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new AppError('Usuário não encontrado', 404);
  if (id === performedBy) throw new AppError('Não é possível desativar sua própria conta', 400);

  await prisma.user.update({ where: { id }, data: { isActive: false } });

  await createAuditLog({
    userId: performedBy, action: 'DEACTIVATE', entity: 'User', entityId: id,
    details: { name: existing.name }, ipAddress,
  });
}
