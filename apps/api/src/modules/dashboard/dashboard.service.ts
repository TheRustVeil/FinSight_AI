import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';

export async function getDashboardSummary(userId: string, startDate: string, endDate: string, accountId?: string) {
  const base: Prisma.TransactionWhereInput = {
    userId,
    deletedAt: null,
    date: { gte: new Date(startDate), lte: new Date(endDate) },
    ...(accountId && { accountId }),
  };

  // Previous period for comparison
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const prevStart = new Date(start.getTime() - daysDiff * 24 * 60 * 60 * 1000);
  const prevEnd = new Date(start.getTime() - 1);

  const prevBase: Prisma.TransactionWhereInput = {
    userId,
    deletedAt: null,
    date: { gte: prevStart, lte: prevEnd },
    ...(accountId && { accountId }),
  };

  const [income, expense, prevIncome, prevExpense, txCount] = await Promise.all([
    prisma.transaction.aggregate({ where: { ...base, type: 'income' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { ...base, type: 'expense' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { ...prevBase, type: 'income' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { ...prevBase, type: 'expense' }, _sum: { amount: true } }),
    prisma.transaction.count({ where: base }),
  ]);

  const totalIncome = Number(income._sum.amount ?? 0);
  const totalExpense = Number(expense._sum.amount ?? 0);
  const prevTotalIncome = Number(prevIncome._sum.amount ?? 0);
  const prevTotalExpense = Number(prevExpense._sum.amount ?? 0);

  function pctChange(curr: number, prev: number) {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100 * 10) / 10;
  }

  return {
    totalIncome,
    totalExpense,
    netSavings: totalIncome - totalExpense,
    transactionCount: txCount,
    changes: {
      income: pctChange(totalIncome, prevTotalIncome),
      expense: pctChange(totalExpense, prevTotalExpense),
      savings: pctChange(totalIncome - totalExpense, prevTotalIncome - prevTotalExpense),
    },
  };
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

export async function getCategoryBreakdown(userId: string, startDate: string, endDate: string) {
  const results = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      userId, type: 'expense', deletedAt: null, categoryId: { not: null },
      date: { gte: new Date(startDate), lte: new Date(endDate) },
    },
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
  const total = results.reduce((sum, r) => sum + Number(r._sum.amount ?? 0), 0);

  return results.map((r) => ({
    category: catMap[r.categoryId!] ?? null,
    total: Number(r._sum.amount ?? 0),
    count: r._count,
    percentage: total > 0 ? Math.round((Number(r._sum.amount ?? 0) / total) * 100 * 10) / 10 : 0,
  }));
}

export async function getTopMerchants(userId: string, startDate: string, endDate: string, limit = 5) {
  const results = await prisma.transaction.groupBy({
    by: ['merchant'],
    where: {
      userId, type: 'expense', deletedAt: null,
      merchant: { not: null },
      date: { gte: new Date(startDate), lte: new Date(endDate) },
    },
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: 'desc' } },
    take: limit,
  });

  return results.map((r) => ({
    merchant: r.merchant!,
    total: Number(r._sum.amount ?? 0),
    count: r._count,
  }));
}

export async function getRecurringSubscriptions(userId: string) {
  // Find merchants that appear every month for last 3+ months
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId, type: 'expense', deletedAt: null,
      merchant: { not: null },
      date: { gte: threeMonthsAgo },
    },
    select: { merchant: true, amount: true, date: true },
    orderBy: { date: 'desc' },
  });

  // Group by merchant, check if appears in 2+ different months
  const merchantMonths: Record<string, Set<string>> = {};
  const merchantAmounts: Record<string, number[]> = {};

  for (const t of transactions) {
    const key = t.merchant!;
    const monthKey = `${t.date.getFullYear()}-${t.date.getMonth()}`;
    if (!merchantMonths[key]) merchantMonths[key] = new Set();
    if (!merchantAmounts[key]) merchantAmounts[key] = [];
    merchantMonths[key].add(monthKey);
    merchantAmounts[key].push(Number(t.amount));
  }

  return Object.entries(merchantMonths)
    .filter(([, months]) => months.size >= 2)
    .map(([merchant, months]) => {
      const amounts = merchantAmounts[merchant];
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      return { merchant, monthlyAmount: Math.round(avgAmount * 100) / 100, occurrences: months.size };
    })
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);
}

export async function getCashFlow(userId: string, startDate: string, endDate: string) {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId, deletedAt: null,
      date: { gte: new Date(startDate), lte: new Date(endDate) },
      type: { in: ['income', 'expense'] },
    },
    select: { date: true, amount: true, type: true },
    orderBy: { date: 'asc' },
  });

  // Group by week
  const weeks: Record<string, { income: number; expense: number }> = {};
  for (const t of transactions) {
    const d = new Date(t.date);
    const weekStart = new Date(d.setDate(d.getDate() - d.getDay()));
    const key = weekStart.toISOString().split('T')[0];
    if (!weeks[key]) weeks[key] = { income: 0, expense: 0 };
    if (t.type === 'income') weeks[key].income += Number(t.amount);
    else weeks[key].expense += Number(t.amount);
  }

  return Object.entries(weeks).map(([week, vals]) => ({ week, ...vals, net: vals.income - vals.expense }));
}

export async function getHeatmap(userId: string, year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

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
