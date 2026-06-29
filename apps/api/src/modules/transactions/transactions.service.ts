import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { ApiError } from '../../lib/api-error';
import { getPaginationParams, buildPaginationMeta, paginatedResponse } from '../../lib/pagination';
import { categorizeByRules } from '../ai/categorization/rules-engine';
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
  ListTransactionsQuery,
} from './transactions.validation';

export async function listTransactions(userId: string, query: ListTransactionsQuery) {
  const { page, limit, skip } = getPaginationParams(query);

  const where: Prisma.TransactionWhereInput = {
    userId,
    deletedAt: null,
    ...(query.startDate && { date: { gte: new Date(query.startDate) } }),
    ...(query.endDate && { date: { lte: new Date(query.endDate) } }),
    ...(query.startDate && query.endDate && {
      date: { gte: new Date(query.startDate), lte: new Date(query.endDate) },
    }),
    ...(query.categoryId && { categoryId: query.categoryId }),
    ...(query.accountId && { accountId: query.accountId }),
    ...(query.type && { type: query.type }),
    ...(query.source && { source: query.source }),
    ...(query.isFlagged !== undefined && { isFlagged: query.isFlagged }),
    ...(query.isRecurring !== undefined && { isRecurring: query.isRecurring }),
    ...(query.minAmount !== undefined && { amount: { gte: query.minAmount } }),
    ...(query.maxAmount !== undefined && { amount: { lte: query.maxAmount } }),
    ...(query.search && {
      OR: [
        { merchant: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ],
    }),
  };

  const orderBy: Prisma.TransactionOrderByWithRelationInput =
    query.sortBy === 'amount'
      ? { amount: query.sortOrder }
      : query.sortBy === 'merchant'
      ? { merchant: query.sortOrder }
      : { date: query.sortOrder };

  const [data, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
        tags: { select: { tag: true } },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return paginatedResponse(
    data.map((t) => ({ ...t, amount: Number(t.amount), tags: t.tags.map((tag) => tag.tag) })),
    buildPaginationMeta(total, page, limit),
  );
}

export async function createTransaction(userId: string, data: CreateTransactionInput) {
  const { tags, ...txData } = data;

  // Auto-categorize if no category provided
  let categoryId = txData.categoryId;
  let aiCategoryId: string | undefined;
  let aiConfidence: number | undefined;

  if (!categoryId && txData.merchant) {
    const result = categorizeByRules(txData.merchant, txData.description);
    if (result) {
      // categorizeByRules returns a category *slug*; resolve it to the real UUID
      // (categoryId / aiCategoryId are UUID FKs — assigning a slug throws a DB error).
      const matched = await prisma.category.findFirst({
        where: { slug: result.categorySlug, OR: [{ userId }, { userId: null }] },
        select: { id: true },
      });
      if (matched) {
        aiConfidence = result.confidence;
        aiCategoryId = matched.id;
        if (result.confidence >= 0.85) categoryId = matched.id;
      }
    }
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      ...txData,
      date: new Date(txData.date),
      amount: txData.amount,
      categoryId,
      aiCategoryId,
      aiConfidence,
      aiCategoryConfirmed: !!txData.categoryId,
      tags: tags?.length ? { createMany: { data: tags.map((tag) => ({ tag })) } } : undefined,
    },
    include: {
      category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
      tags: { select: { tag: true } },
    },
  });

  return { ...transaction, amount: Number(transaction.amount), tags: transaction.tags.map((t) => t.tag) };
}

export async function getTransaction(userId: string, transactionId: string) {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId, deletedAt: null },
    include: {
      category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
      account: { select: { id: true, name: true, type: true } },
      tags: { select: { tag: true } },
      attachments: true,
    },
  });
  if (!transaction) throw ApiError.notFound('Transaction');
  return { ...transaction, amount: Number(transaction.amount), tags: transaction.tags.map((t) => t.tag) };
}

export async function updateTransaction(userId: string, transactionId: string, data: UpdateTransactionInput) {
  const existing = await prisma.transaction.findFirst({ where: { id: transactionId, userId, deletedAt: null } });
  if (!existing) throw ApiError.notFound('Transaction');

  const { tags, ...txData } = data;

  const transaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      ...txData,
      ...(txData.date && { date: new Date(txData.date) }),
      ...(tags !== undefined && {
        tags: {
          deleteMany: {},
          createMany: { data: tags.map((tag) => ({ tag })) },
        },
      }),
    },
    include: {
      category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
      tags: { select: { tag: true } },
    },
  });

  return { ...transaction, amount: Number(transaction.amount), tags: transaction.tags.map((t) => t.tag) };
}

export async function deleteTransaction(userId: string, transactionId: string) {
  const existing = await prisma.transaction.findFirst({ where: { id: transactionId, userId, deletedAt: null } });
  if (!existing) throw ApiError.notFound('Transaction');
  await prisma.transaction.update({ where: { id: transactionId }, data: { deletedAt: new Date() } });
}

export async function confirmCategory(userId: string, transactionId: string, categoryId: string) {
  const existing = await prisma.transaction.findFirst({ where: { id: transactionId, userId, deletedAt: null } });
  if (!existing) throw ApiError.notFound('Transaction');
  return prisma.transaction.update({
    where: { id: transactionId },
    data: { categoryId, aiCategoryConfirmed: true },
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getSummary(userId: string, startDate?: string, endDate?: string, accountId?: string) {
  const where: Prisma.TransactionWhereInput = {
    userId,
    deletedAt: null,
    ...(accountId && { accountId }),
    ...(startDate && endDate && { date: { gte: new Date(startDate), lte: new Date(endDate) } }),
  };

  const [income, expense, count] = await Promise.all([
    prisma.transaction.aggregate({ where: { ...where, type: 'income' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { ...where, type: 'expense' }, _sum: { amount: true } }),
    prisma.transaction.count({ where }),
  ]);

  const totalIncome = Number(income._sum.amount ?? 0);
  const totalExpense = Number(expense._sum.amount ?? 0);

  return { totalIncome, totalExpense, netSavings: totalIncome - totalExpense, transactionCount: count };
}

export async function getByCategory(userId: string, startDate?: string, endDate?: string) {
  const where: Prisma.TransactionWhereInput = {
    userId,
    type: 'expense',
    deletedAt: null,
    categoryId: { not: null },
    ...(startDate && endDate && { date: { gte: new Date(startDate), lte: new Date(endDate) } }),
  };

  const results = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where,
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: 'desc' } },
  });

  const categoryIds = results.map((r) => r.categoryId!);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true, slug: true, icon: true, color: true },
  });
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  return results.map((r) => ({
    category: catMap[r.categoryId!] ?? null,
    total: Number(r._sum.amount ?? 0),
    count: r._count,
  }));
}

export async function getByMerchant(userId: string, startDate?: string, endDate?: string, limit = 10) {
  const where: Prisma.TransactionWhereInput = {
    userId,
    type: 'expense',
    deletedAt: null,
    merchant: { not: null },
    ...(startDate && endDate && { date: { gte: new Date(startDate), lte: new Date(endDate) } }),
  };

  const results = await prisma.transaction.groupBy({
    by: ['merchant'],
    where,
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: 'desc' } },
    take: limit,
  });

  return results.map((r) => ({
    merchant: r.merchant,
    total: Number(r._sum.amount ?? 0),
    count: r._count,
  }));
}

export async function getHeatmap(userId: string, year?: number, month?: number) {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1;
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);

  const transactions = await prisma.transaction.findMany({
    where: { userId, type: 'expense', deletedAt: null, date: { gte: start, lte: end } },
    select: { date: true, amount: true },
  });

  const map: Record<string, number> = {};
  for (const t of transactions) {
    const key = t.date.toISOString().split('T')[0];
    map[key] = (map[key] ?? 0) + Number(t.amount);
  }

  return Object.entries(map).map(([date, amount]) => ({ date, amount }));
}

export async function getSpendingTrend(userId: string, months = 6) {
  const results = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    const [income, expense] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, type: 'income', deletedAt: null, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: 'expense', deletedAt: null, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);

    results.push({
      month: start.toLocaleString('default', { month: 'short' }),
      year: start.getFullYear(),
      income: Number(income._sum.amount ?? 0),
      expense: Number(expense._sum.amount ?? 0),
    });
  }

  return results;
}
