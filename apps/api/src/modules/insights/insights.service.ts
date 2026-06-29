import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { ApiError } from '../../lib/api-error';
import { createNotification } from '../notifications/notifications.service';

// ── Types ─────────────────────────────────────────────────────────────────────

type InsightType = 'spending_spike' | 'subscription_detected' | 'savings_opportunity' | 'anomaly' | 'forecast' | 'comparison' | 'recommendation';
type InsightSeverity = 'info' | 'warning' | 'alert';

interface InsightPayload {
  userId: string;
  type: InsightType;
  title: string;
  body: string;
  severity: InsightSeverity;
  data?: Prisma.InputJsonValue;
  periodStart?: Date;
  periodEnd?: Date;
  expiresAt?: Date;
}

// ── Generators ────────────────────────────────────────────────────────────────

async function genSpendingSpike(userId: string): Promise<InsightPayload[]> {
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  // Current week spending
  const current = await prisma.transaction.aggregate({
    where: { userId, type: 'expense', deletedAt: null, date: { gte: weekStart, lte: now } },
    _sum: { amount: true },
  });
  const currentSpend = Number(current._sum.amount ?? 0);
  if (currentSpend === 0) return [];

  // Rolling 4-week average
  const fourWeeksAgo = new Date(weekStart); fourWeeksAgo.setDate(weekStart.getDate() - 28);
  const pastFour = await prisma.transaction.aggregate({
    where: { userId, type: 'expense', deletedAt: null, date: { gte: fourWeeksAgo, lt: weekStart } },
    _sum: { amount: true },
  });
  const avgWeek = Number(pastFour._sum.amount ?? 0) / 4;
  if (avgWeek === 0) return [];

  const ratio = currentSpend / avgWeek;
  if (ratio < 1.4) return [];

  return [{
    userId, type: 'spending_spike',
    title: 'Spending spike this week',
    body: `You've spent ₹${Math.round(currentSpend).toLocaleString('en-IN')} this week — ${Math.round((ratio - 1) * 100)}% above your 4-week average of ₹${Math.round(avgWeek).toLocaleString('en-IN')}. Check your recent transactions to see what drove this.`,
    severity: ratio >= 2 ? 'alert' : 'warning',
    data: { currentSpend, avgWeek, ratio: Math.round(ratio * 100) / 100 },
    periodStart: weekStart, periodEnd: now,
    expiresAt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
  }];
}

async function genForecast(userId: string): Promise<InsightPayload[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = now.getDate();

  if (daysElapsed < 5) return []; // Not enough data

  // Current month spending so far
  const current = await prisma.transaction.aggregate({
    where: { userId, type: 'expense', deletedAt: null, date: { gte: monthStart, lte: now } },
    _sum: { amount: true },
  });
  const spentSoFar = Number(current._sum.amount ?? 0);
  if (spentSoFar === 0) return [];

  const dailyRate = spentSoFar / daysElapsed;
  const projected = dailyRate * daysInMonth;

  // Compare to last 3 months avg
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const historical = await prisma.transaction.aggregate({
    where: { userId, type: 'expense', deletedAt: null, date: { gte: threeMonthsAgo, lt: monthStart } },
    _sum: { amount: true },
  });
  const avgMonthly = Number(historical._sum.amount ?? 0) / 3;

  const insights: InsightPayload[] = [];
  const monthName = now.toLocaleString('default', { month: 'long' });

  if (avgMonthly > 0) {
    const pctAbove = ((projected - avgMonthly) / avgMonthly) * 100;
    if (pctAbove > 20) {
      insights.push({
        userId, type: 'forecast',
        title: `${monthName} spending on track to exceed average`,
        body: `At your current pace, you'll spend ₹${Math.round(projected).toLocaleString('en-IN')} this month — ${Math.round(pctAbove)}% above your 3-month average of ₹${Math.round(avgMonthly).toLocaleString('en-IN')}. You have ${daysInMonth - daysElapsed} days left to course-correct.`,
        severity: pctAbove > 50 ? 'alert' : 'warning',
        data: { projected, avgMonthly, spentSoFar, daysElapsed, daysInMonth },
        periodStart: monthStart, periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      });
    } else if (pctAbove < -15) {
      insights.push({
        userId, type: 'forecast',
        title: `Great pace! ${monthName} spending looks lower than usual`,
        body: `You're projected to spend ₹${Math.round(projected).toLocaleString('en-IN')} this month — ${Math.abs(Math.round(pctAbove))}% below your 3-month average. You're on track to save an extra ₹${Math.round(avgMonthly - projected).toLocaleString('en-IN')}.`,
        severity: 'info',
        data: { projected, avgMonthly, spentSoFar },
        periodStart: monthStart,
      });
    }
  }

  return insights;
}

async function genSavingsOpportunity(userId: string): Promise<InsightPayload[]> {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [thisMonth, lastMonth] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId, type: 'expense', deletedAt: null, date: { gte: thisMonthStart, lte: now }, categoryId: { not: null } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId, type: 'expense', deletedAt: null, date: { gte: lastMonthStart, lte: lastMonthEnd }, categoryId: { not: null } },
      _sum: { amount: true },
    }),
  ]);

  const lastMap: Record<string, number> = {};
  for (const r of lastMonth) if (r.categoryId) lastMap[r.categoryId] = Number(r._sum.amount ?? 0);

  const spikes = thisMonth
    .filter((r) => r.categoryId && lastMap[r.categoryId] > 0)
    .map((r) => ({ categoryId: r.categoryId!, current: Number(r._sum.amount ?? 0), last: lastMap[r.categoryId!] }))
    .filter((x) => x.current / x.last > 1.5 && x.current - x.last > 1000);

  if (!spikes.length) return [];
  const top = spikes.sort((a, b) => (b.current - b.last) - (a.current - a.last))[0];

  const category = await prisma.category.findFirst({ where: { id: top.categoryId }, select: { name: true } });

  return [{
    userId, type: 'savings_opportunity',
    title: `${category?.name ?? 'Unknown'} spending up ${Math.round(((top.current - top.last) / top.last) * 100)}% vs last month`,
    body: `You've spent ₹${Math.round(top.current).toLocaleString('en-IN')} on ${category?.name ?? 'this category'} so far this month vs ₹${Math.round(top.last).toLocaleString('en-IN')} last month. Reviewing these transactions could save you ₹${Math.round(top.current - top.last).toLocaleString('en-IN')}.`,
    severity: 'warning',
    data: { categoryId: top.categoryId, currentSpend: top.current, lastMonthSpend: top.last },
    periodStart: thisMonthStart, periodEnd: now,
  }];
}

async function genBudgetAlerts(userId: string): Promise<InsightPayload[]> {
  const budgets = await prisma.budget.findMany({
    where: { userId, isActive: true },
    include: { budgetCategories: { include: { category: { select: { name: true } } } } },
  });

  const insights: InsightPayload[] = [];
  const now = new Date();

  for (const budget of budgets) {
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    for (const bc of budget.budgetCategories) {
      const spent = await prisma.transaction.aggregate({
        where: { userId, type: 'expense', deletedAt: null, categoryId: bc.categoryId, date: { gte: periodStart, lte: periodEnd } },
        _sum: { amount: true },
      });
      const spentAmt = Number(spent._sum.amount ?? 0);
      const limit = Number(bc.allocatedAmount);
      const pct = limit > 0 ? (spentAmt / limit) * 100 : 0;

      if (pct >= 100) {
        insights.push({
          userId, type: 'recommendation',
          title: `${bc.category.name} budget exceeded`,
          body: `You've spent ₹${Math.round(spentAmt).toLocaleString('en-IN')} on ${bc.category.name} this month, exceeding your ₹${Math.round(limit).toLocaleString('en-IN')} limit by ₹${Math.round(spentAmt - limit).toLocaleString('en-IN')}.`,
          severity: 'alert',
          data: { budgetId: budget.id, categoryId: bc.categoryId, spent: spentAmt, limit, percentage: Math.round(pct) },
        });
      } else if (pct >= bc.alertAtPercent) {
        insights.push({
          userId, type: 'recommendation',
          title: `${bc.category.name} at ${Math.round(pct)}% of budget`,
          body: `You've used ${Math.round(pct)}% of your ${bc.category.name} budget with ${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()} days remaining this month.`,
          severity: 'warning',
          data: { budgetId: budget.id, categoryId: bc.categoryId, spent: spentAmt, limit, percentage: Math.round(pct) },
        });
      }
    }
  }
  return insights;
}

async function genSubscriptions(userId: string): Promise<InsightPayload[]> {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const txns = await prisma.transaction.findMany({
    where: { userId, type: 'expense', deletedAt: null, merchant: { not: null }, date: { gte: threeMonthsAgo } },
    select: { merchant: true, amount: true, date: true },
  });

  const merchantMonths: Record<string, Set<string>> = {};
  const merchantAmounts: Record<string, number[]> = {};
  for (const t of txns) {
    const key = t.merchant!;
    const mk = `${t.date.getFullYear()}-${t.date.getMonth()}`;
    if (!merchantMonths[key]) merchantMonths[key] = new Set();
    if (!merchantAmounts[key]) merchantAmounts[key] = [];
    merchantMonths[key].add(mk);
    merchantAmounts[key].push(Number(t.amount));
  }

  const subs = Object.entries(merchantMonths)
    .filter(([, months]) => months.size >= 2)
    .map(([merchant, months]) => {
      const amounts = merchantAmounts[merchant];
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      return { merchant, monthlyAmount: Math.round(avg), occurrences: months.size };
    })
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  if (!subs.length) return [];
  const total = subs.reduce((s, x) => s + x.monthlyAmount, 0);

  return [{
    userId, type: 'subscription_detected',
    title: `${subs.length} recurring subscriptions detected`,
    body: `You have ${subs.length} recurring payments totalling ₹${total.toLocaleString('en-IN')}/month: ${subs.slice(0, 3).map((s) => s.merchant).join(', ')}${subs.length > 3 ? ` and ${subs.length - 3} more` : ''}. Review if all are still needed.`,
    severity: 'info',
    data: { subscriptions: subs, totalMonthly: total },
  }];
}

// ── Main generator — called by worker or on-demand ────────────────────────────

export async function generateInsights(userId: string): Promise<number> {
  // Clear old non-dismissed insights before regenerating
  await prisma.insight.deleteMany({
    where: { userId, isDismissed: false, generatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });

  const all = (await Promise.all([
    genSpendingSpike(userId),
    genForecast(userId),
    genSavingsOpportunity(userId),
    genBudgetAlerts(userId),
    genSubscriptions(userId),
  ])).flat();

  if (all.length) {
    await prisma.insight.createMany({
      data: all.map((i) => ({
        userId: i.userId,
        type: i.type,
        title: i.title,
        body: i.body,
        severity: i.severity,
        data: i.data ?? {},
        periodStart: i.periodStart ?? null,
        periodEnd: i.periodEnd ?? null,
        expiresAt: i.expiresAt ?? null,
        isRead: false,
        isDismissed: false,
      })),
    });

    // Surface alert/warning-severity insights as in-app notifications
    const notifiable = all.filter((i) => i.severity === 'alert' || i.severity === 'warning');
    for (const i of notifiable) {
      await createNotification({
        userId: i.userId,
        type: i.type === 'spending_spike' ? 'spending_spike' : i.type === 'recommendation' ? 'budget_alert' : 'insight',
        title: i.title,
        body: i.body,
        data: { insightType: i.type, severity: i.severity },
      });
    }
  }

  return all.length;
}

// ── Read / manage insights ────────────────────────────────────────────────────

export async function listInsights(userId: string) {
  return prisma.insight.findMany({
    where: { userId, isDismissed: false },
    orderBy: [{ severity: 'desc' }, { generatedAt: 'desc' }],
    take: 50,
  });
}

export async function markRead(userId: string, insightId: string) {
  const i = await prisma.insight.findFirst({ where: { id: insightId, userId } });
  if (!i) throw ApiError.notFound('Insight not found');
  return prisma.insight.update({ where: { id: insightId }, data: { isRead: true } });
}

export async function dismissInsight(userId: string, insightId: string) {
  const i = await prisma.insight.findFirst({ where: { id: insightId, userId } });
  if (!i) throw ApiError.notFound('Insight not found');
  return prisma.insight.update({ where: { id: insightId }, data: { isDismissed: true } });
}

export async function markAllRead(userId: string) {
  await prisma.insight.updateMany({ where: { userId, isRead: false, isDismissed: false }, data: { isRead: true } });
}

export async function getUnreadCount(userId: string) {
  return prisma.insight.count({ where: { userId, isRead: false, isDismissed: false } });
}

// ── 6-month spending forecast with weighted moving average ────────────────────

export async function getSpendingForecast(userId: string) {
  const now = new Date();
  const months: { label: string; actual?: number; forecast?: number }[] = [];

  // Past 6 months actual
  const actuals: number[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const result = await prisma.transaction.aggregate({
      where: { userId, type: 'expense', deletedAt: null, date: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    const amount = Number(result._sum.amount ?? 0);
    actuals.push(amount);
    months.push({ label: start.toLocaleString('default', { month: 'short', year: 'numeric' }), actual: amount });
  }

  // Weighted moving average for next 3 months
  const weights = [1, 2, 3, 4, 5, 6];
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const wma = actuals.reduce((sum, val, i) => sum + val * weights[i], 0) / weightSum;

  // Add 3 forecast months
  for (let i = 1; i <= 3; i++) {
    const start = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({
      label: start.toLocaleString('default', { month: 'short', year: 'numeric' }),
      forecast: Math.round(wma),
    });
  }

  return { months, wma: Math.round(wma), currency: 'INR' };
}
