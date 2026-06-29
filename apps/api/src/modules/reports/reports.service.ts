import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';

interface ReportRange {
  startDate: string;
  endDate: string;
  accountId?: string;
}

function rangeWhere(userId: string, range: ReportRange): Prisma.TransactionWhereInput {
  return {
    userId,
    deletedAt: null,
    date: { gte: new Date(range.startDate), lte: new Date(range.endDate) },
    ...(range.accountId && { accountId: range.accountId }),
  };
}

// ── CSV export ────────────────────────────────────────────────────────────────

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportTransactionsCsv(userId: string, range: ReportRange): Promise<string> {
  const transactions = await prisma.transaction.findMany({
    where: rangeWhere(userId, range),
    include: {
      category: { select: { name: true } },
      account: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
  });

  const headers = ['Date', 'Merchant', 'Description', 'Category', 'Account', 'Type', 'Amount', 'Currency'];
  const rows = transactions.map((t) => [
    t.date.toISOString().split('T')[0],
    csvEscape(t.merchant),
    csvEscape(t.description),
    csvEscape(t.category?.name ?? 'Uncategorized'),
    csvEscape(t.account?.name ?? ''),
    t.type,
    Number(t.amount).toFixed(2),
    t.currency ?? 'INR',
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

// ── JSON summary report ───────────────────────────────────────────────────────

export async function generateSummaryReport(userId: string, range: ReportRange) {
  const where = rangeWhere(userId, range);

  const [income, expense, byCategory, byMonth, txCount, topMerchants] = await Promise.all([
    prisma.transaction.aggregate({ where: { ...where, type: 'income' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { ...where, type: 'expense' }, _sum: { amount: true } }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { ...where, type: 'expense', categoryId: { not: null } },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    }),
    prisma.transaction.findMany({
      where,
      select: { date: true, amount: true, type: true },
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.groupBy({
      by: ['merchant'],
      where: { ...where, type: 'expense', merchant: { not: null } },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    }),
  ]);

  // Resolve category names
  const catIds = byCategory.map((c) => c.categoryId!);
  const categories = await prisma.category.findMany({
    where: { id: { in: catIds } },
    select: { id: true, name: true, icon: true, color: true },
  });
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  const totalIncome = Number(income._sum.amount ?? 0);
  const totalExpense = Number(expense._sum.amount ?? 0);

  // Group transactions by month
  const monthly: Record<string, { income: number; expense: number }> = {};
  for (const t of byMonth) {
    const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthly[key]) monthly[key] = { income: 0, expense: 0 };
    if (t.type === 'income') monthly[key].income += Number(t.amount);
    else if (t.type === 'expense') monthly[key].expense += Number(t.amount);
  }

  return {
    period: { startDate: range.startDate, endDate: range.endDate },
    summary: {
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense,
      savingsRate: totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100 * 10) / 10 : 0,
      transactionCount: txCount,
      avgTransaction: txCount > 0 ? Math.round((totalExpense / txCount) * 100) / 100 : 0,
    },
    byCategory: byCategory.map((c) => ({
      category: catMap[c.categoryId!] ?? { name: 'Unknown' },
      total: Number(c._sum.amount ?? 0),
      count: c._count,
      percentage: totalExpense > 0 ? Math.round((Number(c._sum.amount ?? 0) / totalExpense) * 100 * 10) / 10 : 0,
    })),
    byMonth: Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, vals]) => ({ month, ...vals, net: vals.income - vals.expense })),
    topMerchants: topMerchants.map((m) => ({
      merchant: m.merchant!,
      total: Number(m._sum.amount ?? 0),
      count: m._count,
    })),
    generatedAt: new Date().toISOString(),
  };
}
