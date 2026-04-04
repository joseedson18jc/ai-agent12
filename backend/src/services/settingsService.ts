import prisma from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { createAuditLog } from './auditService.js';

export async function getSettings() {
  const store = await prisma.store.findFirst();
  if (!store) throw new AppError('Configurações da loja não encontradas', 404);
  return store;
}

export async function updateSettings(data: any, userId: string, ipAddress?: string) {
  const store = await prisma.store.findFirst();
  if (!store) throw new AppError('Configurações da loja não encontradas', 404);

  const updated = await prisma.store.update({ where: { id: store.id }, data });

  await createAuditLog({
    userId, action: 'UPDATE', entity: 'Store', entityId: store.id,
    details: { changes: data }, ipAddress,
  });

  return updated;
}
