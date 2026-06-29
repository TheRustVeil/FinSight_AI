import { z } from 'zod';
import { prisma } from '../../config/database';
import { ApiError } from '../../lib/api-error';

// ── Validation schemas ────────────────────────────────────────────────────────

export const createBudgetSchema = z.object({
  name: z.string().min(1).max(255),
  period: z.enum(['weekly', 'monthly', 'yearly']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalAmount: z.number().positive().optional(),
  categories: z.array(z.object({
    categoryId: z.string().uuid(),
    allocatedAmount: z.number().positive(),
    alertAtPercent: z.number().int().min(1).max(100).default(80),
  })).min(1),
});

export const updateBudgetSchema = createBudgetSchema.partial();

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

// ── Period window helpers ─────────────────────────────────────────────────────

function currentPeriodWindow(period: 'weekly' | 'monthly' | 'yearly'): { start: Date; end: Date } {
  const now = new Date();
  if (period === 'monthly') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };
  }
  if (period === 'weekly') {
    const day = now.getDay();
    const mon = new Date(now); mon.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { start: mon, end: sun };
  }
  // yearly
  return {
    start: new Date(now.getFullYear(), 0, 1),
    end: new Date(now.getFullYear(), 11, 31),
  };
}

// ── Utilization calculator ────────────────────────────────────────────────────

async function calcUtilization(budgetId: string, period: 'weekly' | 'monthly' | 'yearly', budgetCategories: { id: string; categoryId: string; allocatedAmount: number; alertAtPercent: number }[]) {
  const { start, end } = currentPeriodWindow(period);
  const catIds = budgetCategories.map((bc) => bc.categoryId);

  const rows = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      categoryId: { in: catIds },
      type: 'expense',
      deletedAt: null,
      date: { gte: start, lte: end },
    },
    _sum: { amount: true },
  });

  const spentMap: Record<string, number> = {};
  for (const r of rows) if (r.categoryId) spentMap[r.categoryId] = Number(r._sum.amount ?? 0);

  let totalSpent = 0;
  let totalLimit = 0;

  const categories = budgetCategories.map((bc) => {
    const spent = spentMap[bc.categoryId] ?? 0;
    const pct = bc.allocatedAmount > 0 ? Math.round((spent / bc.allocatedAmount) * 100 * 10) / 10 : 0;
    totalSpent += spent;
    totalLimit += bc.allocatedAmount;
    return { ...bc, spent, percentage: pct, isOverBudget: spent > bc.allocatedAmount };
  });

  return {
    categories,
    totalSpent,
    totalLimit,
    totalPercentage: totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100 * 10) / 10 : 0,
    periodStart: start.toISOString().split('T')[0],
    periodEnd: end.toISOString().split('T')[0],
  };
}

// ── Service methods ───────────────────────────────────────────────────────────

export async function listBudgets(userId: string) {
  const budgets = await prisma.budget.findMany({
    where: { userId, isActive: true },
    include: {
      budgetCategories: {
        include: { category: { select: { id: true, name: true, icon: true, color: true, slug: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return Promise.all(
    budgets.map(async (b) => {
      const cats = b.budgetCategories.map((bc) => ({
        id: bc.id,
        categoryId: bc.categoryId,
        category: bc.category,
        allocatedAmount: Number(bc.allocatedAmount),
        alertAtPercent: bc.alertAtPercent,
      }));
      const util = await calcUtilization(b.id, b.period, cats);
      return { ...b, totalAmount: b.totalAmount ? Number(b.totalAmount) : null, utilization: util };
    }),
  );
}

export async function getBudget(userId: string, budgetId: string) {
  const b = await prisma.budget.findFirst({
    where: { id: budgetId, userId },
    include: {
      budgetCategories: {
        include: { category: { select: { id: true, name: true, icon: true, color: true, slug: true } } },
      },
    },
  });
  if (!b) throw ApiError.notFound('Budget not found');
  const cats = b.budgetCategories.map((bc) => ({
    id: bc.id, categoryId: bc.categoryId, category: bc.category,
    allocatedAmount: Number(bc.allocatedAmount), alertAtPercent: bc.alertAtPercent,
  }));
  const util = await calcUtilization(b.id, b.period, cats);
  return { ...b, totalAmount: b.totalAmount ? Number(b.totalAmount) : null, utilization: util };
}

export async function createBudget(userId: string, input: CreateBudgetInput) {
  const totalAmount = input.totalAmount ?? input.categories.reduce((s, c) => s + c.allocatedAmount, 0);

  const budget = await prisma.budget.create({
    data: {
      userId,
      name: input.name,
      period: input.period,
      startDate: new Date(input.startDate),
      totalAmount,
      isActive: true,
      budgetCategories: {
        create: input.categories.map((c) => ({
          categoryId: c.categoryId,
          allocatedAmount: c.allocatedAmount,
          alertAtPercent: c.alertAtPercent ?? 80,
        })),
      },
    },
    include: {
      budgetCategories: {
        include: { category: { select: { id: true, name: true, icon: true, color: true, slug: true } } },
      },
    },
  });

  return budget;
}

export async function updateBudget(userId: string, budgetId: string, input: Partial<CreateBudgetInput>) {
  const existing = await prisma.budget.findFirst({ where: { id: budgetId, userId } });
  if (!existing) throw ApiError.notFound('Budget not found');

  const data: Record<string, unknown> = {};
  if (input.name) data.name = input.name;
  if (input.period) data.period = input.period;
  if (input.startDate) data.startDate = new Date(input.startDate);
  if (input.totalAmount) data.totalAmount = input.totalAmount;

  if (input.categories) {
    await prisma.budgetCategory.deleteMany({ where: { budgetId } });
    data.totalAmount = input.totalAmount ?? input.categories.reduce((s, c) => s + c.allocatedAmount, 0);
  }

  const updated = await prisma.budget.update({
    where: { id: budgetId },
    data: {
      ...data,
      ...(input.categories && {
        budgetCategories: {
          create: input.categories.map((c) => ({
            categoryId: c.categoryId,
            allocatedAmount: c.allocatedAmount,
            alertAtPercent: c.alertAtPercent ?? 80,
          })),
        },
      }),
    },
    include: {
      budgetCategories: {
        include: { category: { select: { id: true, name: true, icon: true, color: true, slug: true } } },
      },
    },
  });

  return updated;
}

export async function deleteBudget(userId: string, budgetId: string) {
  const existing = await prisma.budget.findFirst({ where: { id: budgetId, userId } });
  if (!existing) throw ApiError.notFound('Budget not found');
  await prisma.budget.delete({ where: { id: budgetId } });
}
