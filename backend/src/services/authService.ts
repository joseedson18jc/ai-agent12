import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';
import { generateToken, JwtPayload } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';
import { createAuditLog } from './auditService.js';

export async function login(email: string, password: string, ipAddress?: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    throw new AppError('E-mail ou senha inválidos', 401);
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new AppError('E-mail ou senha inválidos', 401);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const token = generateToken(payload);

  await createAuditLog({
    userId: user.id,
    action: 'LOGIN',
    entity: 'User',
    entityId: user.id,
    ipAddress,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function registerUser(
  data: { name: string; email: string; password: string; role: string },
  performedBy: string,
  ipAddress?: string
) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError('E-mail já cadastrado', 409);
  }

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
    userId: performedBy,
    action: 'CREATE',
    entity: 'User',
    entityId: user.id,
    details: { name: data.name, email: data.email, role: data.role },
    ipAddress,
  });

  return user;
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
    },
  });
  if (!user) throw new AppError('Usuário não encontrado', 404);
  return user;
}
