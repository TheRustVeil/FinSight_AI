import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { ApiError } from '../../lib/api-error';

export const createAccountSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['checking', 'savings', 'credit', 'cash', 'investment']),
  institution: z.string().max(255).optional(),
  currency: z.string().length(3).default('INR'),
  balance: z.number().default(0),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  isDefault: z.boolean().default(false),
});

export const updateAccountSchema = createAccountSchema.partial();

export async function listAccounts(userId: string) {
  return prisma.account.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
}

export async function createAccount(userId: string, data: z.infer<typeof createAccountSchema>) {
  if (data.isDefault) {
    await prisma.account.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  return prisma.account.create({ data: { userId, ...data } as Prisma.AccountUncheckedCreateInput });
}

export async function getAccount(userId: string, accountId: string) {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!account) throw ApiError.notFound('Account');
  return account;
}

export async function updateAccount(userId: string, accountId: string, data: z.infer<typeof updateAccountSchema>) {
  await getAccount(userId, accountId);
  if (data.isDefault) {
    await prisma.account.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  return prisma.account.update({ where: { id: accountId }, data });
}

export async function deleteAccount(userId: string, accountId: string) {
  await getAccount(userId, accountId);
  await prisma.account.delete({ where: { id: accountId } });
}

export async function getAccountSummary(userId: string, accountId: string) {
  await getAccount(userId, accountId);
  const [income, expense] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, accountId, type: 'income', deletedAt: null },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, accountId, type: 'expense', deletedAt: null },
      _sum: { amount: true },
    }),
  ]);
  return {
    totalIncome: Number(income._sum.amount ?? 0),
    totalExpense: Number(expense._sum.amount ?? 0),
  };
}
