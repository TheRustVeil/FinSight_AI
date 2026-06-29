import { prisma } from '../../../config/database';

export async function buildFinancialContext(userId: string): Promise<string> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [incomeTx, expenseTx, topCategories, budgets, goals, accountSummary] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, type: 'income', deletedAt: null, date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: 'expense', deletedAt: null, date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId, type: 'expense', deletedAt: null, date: { gte: monthStart, lte: monthEnd }, categoryId: { not: null } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    }),
    prisma.budget.findMany({
      where: { userId, isActive: true },
      include: { budgetCategories: { include: { category: { select: { name: true } } } } },
    }),
    prisma.goal.findMany({
      where: { userId, isCompleted: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.account.findMany({
      where: { userId },
      select: { name: true, type: true, balance: true, currency: true },
    }),
  ]);

  const catIds = topCategories.map((c) => c.categoryId!);
  const catNames = await prisma.category.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true } });
  const catMap = Object.fromEntries(catNames.map((c) => [c.id, c.name]));

  const income = Number(incomeTx._sum.amount ?? 0);
  const expense = Number(expenseTx._sum.amount ?? 0);
  const savings = income - expense;

  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  const lines: string[] = [
    '=== USER FINANCIAL CONTEXT ===',
    `As of: ${now.toDateString()}`,
    '',
    `## ${monthLabel} Summary`,
    `- Income: ₹${income.toLocaleString('en-IN')}`,
    `- Expenses: ₹${expense.toLocaleString('en-IN')}`,
    `- Net Savings: ₹${savings.toLocaleString('en-IN')} (${income > 0 ? Math.round((savings / income) * 100) : 0}% savings rate)`,
  ];

  if (accountSummary.length > 0) {
    lines.push('', '## Accounts');
    for (const acc of accountSummary) {
      lines.push(`- ${acc.name} (${acc.type}): ₹${Number(acc.balance).toLocaleString('en-IN')}`);
    }
  }

  if (topCategories.length > 0) {
    lines.push('', `## Top Spending Categories (${monthLabel})`);
    for (const c of topCategories) {
      const name = catMap[c.categoryId!] ?? 'Unknown';
      lines.push(`- ${name}: ₹${Number(c._sum.amount).toLocaleString('en-IN')}`);
    }
  }

  if (budgets.length > 0) {
    lines.push('', '## Active Budgets');
    for (const b of budgets) {
      const totalAllocated = b.budgetCategories.reduce((s, bc) => s + Number(bc.allocatedAmount), 0);
      lines.push(`- ${b.name} (${b.period}): limit ₹${totalAllocated.toLocaleString('en-IN')}`);
      for (const bc of b.budgetCategories) {
        lines.push(`  • ${bc.category.name}: ₹${Number(bc.allocatedAmount).toLocaleString('en-IN')}/period`);
      }
    }
  }

  if (goals.length > 0) {
    lines.push('', '## Savings Goals');
    for (const g of goals) {
      const pct = Number(g.targetAmount) > 0
        ? Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100)
        : 0;
      lines.push(`- ${g.name}: ₹${Number(g.currentAmount).toLocaleString('en-IN')} / ₹${Number(g.targetAmount).toLocaleString('en-IN')} (${pct}%)`);
    }
  }

  lines.push('=== END CONTEXT ===');
  return lines.join('\n');
}
