import { z } from 'zod';
import { prisma } from '../../config/database';
import { ApiError } from '../../lib/api-error';

// ── Validation schemas ────────────────────────────────────────────────────────

export const createGoalSchema = z.object({
  name: z.string().min(1).max(255),
  targetAmount: z.number().positive(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.string().max(100).optional(),
});

export const updateGoalSchema = createGoalSchema.partial();

export const addContributionSchema = z.object({
  amount: z.number().positive(),
  notes: z.string().max(500).optional(),
  contributedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type AddContributionInput = z.infer<typeof addContributionSchema>;

// ── Service methods ───────────────────────────────────────────────────────────

export async function listGoals(userId: string) {
  const goals = await prisma.goal.findMany({
    where: { userId },
    include: {
      contributions: {
        orderBy: { contributedAt: 'desc' },
        take: 5,
      },
    },
    orderBy: [{ isCompleted: 'asc' }, { createdAt: 'desc' }],
  });

  return goals.map((g) => ({
    ...g,
    targetAmount: Number(g.targetAmount),
    currentAmount: Number(g.currentAmount),
    percentage: Number(g.targetAmount) > 0
      ? Math.min(100, Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100 * 10) / 10)
      : 0,
    remaining: Math.max(0, Number(g.targetAmount) - Number(g.currentAmount)),
    contributions: g.contributions.map((c) => ({ ...c, amount: Number(c.amount) })),
  }));
}

export async function getGoal(userId: string, goalId: string) {
  const g = await prisma.goal.findFirst({
    where: { id: goalId, userId },
    include: {
      contributions: { orderBy: { contributedAt: 'desc' } },
    },
  });
  if (!g) throw ApiError.notFound('Goal not found');
  return {
    ...g,
    targetAmount: Number(g.targetAmount),
    currentAmount: Number(g.currentAmount),
    percentage: Number(g.targetAmount) > 0
      ? Math.min(100, Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100 * 10) / 10)
      : 0,
    remaining: Math.max(0, Number(g.targetAmount) - Number(g.currentAmount)),
    contributions: g.contributions.map((c) => ({ ...c, amount: Number(c.amount) })),
  };
}

export async function createGoal(userId: string, input: CreateGoalInput) {
  return prisma.goal.create({
    data: {
      userId,
      name: input.name,
      targetAmount: input.targetAmount,
      currentAmount: 0,
      targetDate: input.targetDate ? new Date(input.targetDate) : null,
      category: input.category ?? null,
      isCompleted: false,
    },
  });
}

export async function updateGoal(userId: string, goalId: string, input: Partial<CreateGoalInput>) {
  const existing = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!existing) throw ApiError.notFound('Goal not found');

  return prisma.goal.update({
    where: { id: goalId },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.targetAmount && { targetAmount: input.targetAmount }),
      ...(input.targetDate !== undefined && { targetDate: input.targetDate ? new Date(input.targetDate) : null }),
      ...(input.category !== undefined && { category: input.category ?? null }),
    },
  });
}

export async function deleteGoal(userId: string, goalId: string) {
  const existing = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!existing) throw ApiError.notFound('Goal not found');
  await prisma.goal.delete({ where: { id: goalId } });
}

export async function addContribution(userId: string, goalId: string, input: AddContributionInput) {
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!goal) throw ApiError.notFound('Goal not found');
  if (goal.isCompleted) throw ApiError.badRequest('Goal is already completed');

  const newAmount = Number(goal.currentAmount) + input.amount;
  const isCompleted = newAmount >= Number(goal.targetAmount);

  const [contribution] = await prisma.$transaction([
    prisma.goalContribution.create({
      data: {
        goalId,
        amount: input.amount,
        notes: input.notes ?? null,
        contributedAt: input.contributedAt ? new Date(input.contributedAt) : new Date(),
      },
    }),
    prisma.goal.update({
      where: { id: goalId },
      data: { currentAmount: newAmount, isCompleted },
    }),
  ]);

  return { contribution: { ...contribution, amount: Number(contribution.amount) }, isCompleted };
}

export async function deleteContribution(userId: string, goalId: string, contributionId: string) {
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!goal) throw ApiError.notFound('Goal not found');

  const contrib = await prisma.goalContribution.findFirst({ where: { id: contributionId, goalId } });
  if (!contrib) throw ApiError.notFound('Contribution not found');

  const newAmount = Math.max(0, Number(goal.currentAmount) - Number(contrib.amount));

  await prisma.$transaction([
    prisma.goalContribution.delete({ where: { id: contributionId } }),
    prisma.goal.update({ where: { id: goalId }, data: { currentAmount: newAmount, isCompleted: false } }),
  ]);
}
