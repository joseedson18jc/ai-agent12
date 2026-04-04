import cron from 'node-cron';
import prisma from '../utils/prisma.js';
import { addMonths } from 'date-fns';

/**
 * Mark overdue installments: any PENDING installment past its due date
 */
async function markOverdueInstallments() {
  try {
    const result = await prisma.installment.updateMany({
      where: {
        status: 'PENDING',
        dueDate: { lt: new Date() },
      },
      data: { status: 'OVERDUE' },
    });
    if (result.count > 0) {
      console.log(`[Scheduler] ${result.count} parcela(s) marcada(s) como atrasada(s)`);
    }
  } catch (error) {
    console.error('[Scheduler] Erro ao marcar parcelas atrasadas:', error);
  }
}

/**
 * Mark overdue bills: any PENDING bill past its due date
 */
async function markOverdueBills() {
  try {
    const result = await prisma.billToPay.updateMany({
      where: {
        status: 'PENDING',
        isDeleted: false,
        dueDate: { lt: new Date() },
      },
      data: { status: 'OVERDUE' },
    });
    if (result.count > 0) {
      console.log(`[Scheduler] ${result.count} conta(s) a pagar marcada(s) como atrasada(s)`);
    }
  } catch (error) {
    console.error('[Scheduler] Erro ao marcar contas atrasadas:', error);
  }
}

/**
 * Check expired prescriptions and mark them
 */
async function checkExpiredPrescriptions() {
  try {
    const result = await prisma.prescription.updateMany({
      where: {
        isExpired: false,
        isDeleted: false,
        validity: { lt: new Date() },
      },
      data: { isExpired: true },
    });
    if (result.count > 0) {
      console.log(`[Scheduler] ${result.count} receita(s) marcada(s) como vencida(s)`);
    }
  } catch (error) {
    console.error('[Scheduler] Erro ao verificar receitas vencidas:', error);
  }
}

/**
 * Generate recurring bills for the current month
 * Runs on the 1st of each month
 */
async function generateRecurringBills() {
  try {
    const recurringBills = await prisma.billToPay.findMany({
      where: {
        isRecurring: true,
        isDeleted: false,
        status: { not: 'CANCELLED' },
        frequency: { not: null },
      },
    });

    const now = new Date();
    let generated = 0;

    for (const bill of recurringBills) {
      // Check if a bill for this month already exists for this parent
      const existingThisMonth = await prisma.billToPay.findFirst({
        where: {
          parentBillId: bill.id,
          dueDate: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
            lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
          },
        },
      });

      if (existingThisMonth) continue;

      // Calculate next due date based on frequency
      let nextDueDate = new Date(bill.dueDate);
      while (nextDueDate < now) {
        switch (bill.frequency) {
          case 'WEEKLY':
            nextDueDate.setDate(nextDueDate.getDate() + 7);
            break;
          case 'MONTHLY':
            nextDueDate = addMonths(nextDueDate, 1);
            break;
          case 'BIMONTHLY':
            nextDueDate = addMonths(nextDueDate, 2);
            break;
          case 'QUARTERLY':
            nextDueDate = addMonths(nextDueDate, 3);
            break;
          case 'SEMIANNUAL':
            nextDueDate = addMonths(nextDueDate, 6);
            break;
          case 'ANNUAL':
            nextDueDate = addMonths(nextDueDate, 12);
            break;
          default:
            nextDueDate = addMonths(nextDueDate, 1);
        }
      }

      // Only generate if the due date falls in the current month
      if (
        nextDueDate.getMonth() === now.getMonth() &&
        nextDueDate.getFullYear() === now.getFullYear()
      ) {
        await prisma.billToPay.create({
          data: {
            description: bill.description,
            categoryId: bill.categoryId,
            supplierId: bill.supplierId,
            amount: bill.amount,
            dueDate: nextDueDate,
            isRecurring: false,
            parentBillId: bill.id,
            notes: `Gerada automaticamente a partir da conta recorrente: ${bill.description}`,
          },
        });
        generated++;
      }
    }

    if (generated > 0) {
      console.log(`[Scheduler] ${generated} conta(s) recorrente(s) gerada(s) para o mês`);
    }
  } catch (error) {
    console.error('[Scheduler] Erro ao gerar contas recorrentes:', error);
  }
}

export function startScheduler() {
  // Daily at midnight: mark overdue installments, bills, and expired prescriptions
  cron.schedule('0 0 * * *', async () => {
    console.log('[Scheduler] Executando tarefas diárias...');
    await markOverdueInstallments();
    await markOverdueBills();
    await checkExpiredPrescriptions();
  });

  // Monthly on the 1st at 1 AM: generate recurring bills
  cron.schedule('0 1 1 * *', async () => {
    console.log('[Scheduler] Gerando contas recorrentes do mês...');
    await generateRecurringBills();
  });

  console.log('[Scheduler] Tarefas agendadas iniciadas');
}
