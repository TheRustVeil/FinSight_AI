'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, RefreshCw, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import {
  useDashboardSummary,
  useSpendingTrend,
  useDashboardCategories,
  useTopMerchants,
  useRecurringSubscriptions,
  useCashFlow,
  useHeatmap,
} from '@/hooks/useDashboard';
import { useTransactions } from '@/hooks/useTransactions';
import { SpendingTrendChart } from '@/components/charts/SpendingTrendChart';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { CashFlowChart } from '@/components/charts/CashFlowChart';
import { SpendingHeatmap } from '@/components/charts/SpendingHeatmap';
import { DateRangePicker, currentMonthRange } from '@/components/shared/DateRangePicker';
import { formatCurrency, formatCompact, formatDate, formatRelative } from '@/lib/formatters';

interface DateRange { startDate: string; endDate: string; label: string; }

interface StatCardProps {
  label: string;
  value: number;
  change?: number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  valueColor?: string;
  isCurrency?: boolean;
  loading: boolean;
}

function StatCard({ label, value, change, icon: Icon, iconColor, iconBg, valueColor, isCurrency = true, loading }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-28 bg-muted animate-pulse rounded-md" />
          <div className="h-3.5 w-16 bg-muted animate-pulse rounded-md" />
        </div>
      ) : (
        <>
          <p className={`text-2xl font-bold ${valueColor ?? 'text-foreground'}`}>
            {isCurrency ? formatCompact(value) : value.toLocaleString()}
          </p>
          {change !== undefined && (
            <p className={`text-xs mt-1 font-medium ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs last period
            </p>
          )}
        </>
      )}
    </div>
  );
}

function SectionCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-5 ${className}`}>
      <h2 className="font-semibold text-foreground mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [dateRange, setDateRange] = useState<DateRange>(currentMonthRange);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const params = { startDate: dateRange.startDate, endDate: dateRange.endDate };

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useDashboardSummary(params);
  const { data: trend = [], isLoading: trendLoading } = useSpendingTrend(6);
  const { data: categories = [], isLoading: catLoading } = useDashboardCategories(params);
  const { data: merchants = [], isLoading: merchantsLoading } = useTopMerchants({ ...params, limit: 5 });
  const { data: subscriptions = [], isLoading: subsLoading } = useRecurringSubscriptions();
  const { data: cashflow = [], isLoading: cashflowLoading } = useCashFlow(params);
  const { data: heatmapData = [], isLoading: heatmapLoading } = useHeatmap(year, month);
  const { data: recentData, isLoading: recentLoading } = useTransactions({ limit: 6, sortBy: 'date', sortOrder: 'desc' });
  const recentTransactions = recentData?.data ?? [];

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 animate-fade-in pb-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}, {user?.fullName?.split(' ')[0]} ðŸ‘‹
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Here&apos;s your financial snapshot for {dateRange.label}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <button
            onClick={() => refetchSummary()}
            className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Income"
          value={summary?.totalIncome ?? 0}
          change={summary?.changes?.income}
          icon={TrendingUp}
          iconColor="text-green-500"
          iconBg="bg-green-500/10"
          loading={summaryLoading}
        />
        <StatCard
          label="Total Expenses"
          value={summary?.totalExpense ?? 0}
          change={summary?.changes?.expense}
          icon={TrendingDown}
          iconColor="text-red-500"
          iconBg="bg-red-500/10"
          loading={summaryLoading}
        />
        <StatCard
          label="Net Savings"
          value={summary?.netSavings ?? 0}
          change={summary?.changes?.savings}
          icon={PiggyBank}
          iconColor={(summary?.netSavings ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}
          iconBg={(summary?.netSavings ?? 0) >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}
          valueColor={(summary?.netSavings ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}
          loading={summaryLoading}
        />
        <StatCard
          label="Transactions"
          value={summary?.transactionCount ?? 0}
          icon={Wallet}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          isCurrency={false}
          loading={summaryLoading}
        />
      </div>

      {/* ── Row 2: Spending Trend (wide) + Category Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Spending Trend — Last 6 Months" className="lg:col-span-2">
          {trendLoading ? (
            <div className="h-56 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <SpendingTrendChart data={trend} />
          )}
        </SectionCard>

        <SectionCard title="Expenses by Category">
          {catLoading ? (
            <div className="h-56 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <CategoryPieChart data={categories} />
          )}
        </SectionCard>
      </div>

      {/* ── Row 3: Cash Flow + Top Merchants ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Weekly Cash Flow" className="lg:col-span-2">
          {cashflowLoading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <CashFlowChart data={cashflow} />
          )}
        </SectionCard>

        <SectionCard title="Top Merchants">
          {merchantsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-4 bg-muted animate-pulse rounded" />
                  <div className="flex-1 h-4 bg-muted animate-pulse rounded" />
                  <div className="w-16 h-4 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : !merchants.length ? (
            <p className="text-muted-foreground text-sm text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {(merchants as { merchant: string; total: number; count: number }[]).map((m, i) => (
                <div key={m.merchant} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5 text-center">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.merchant}</p>
                    <p className="text-xs text-muted-foreground">{m.count} txns</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0">{formatCurrency(m.total)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Row 4: Spending Heatmap + Recurring Subscriptions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title={`Spending Heatmap — ${new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`}>
          {heatmapLoading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <SpendingHeatmap data={heatmapData} year={year} month={month} />
          )}
        </SectionCard>

        <SectionCard title="Recurring Subscriptions">
          {subsLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
            </div>
          ) : !subscriptions.length ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">No recurring subscriptions detected</p>
              <p className="text-muted-foreground text-xs mt-1">Detected after 2+ months of repeat payments</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(subscriptions as { merchant: string; monthlyAmount: number; occurrences: number }[]).map((s) => (
                <div key={s.merchant} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-sm shrink-0">
                    ðŸ”„
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.merchant}</p>
                    <p className="text-xs text-muted-foreground">{s.occurrences} months detected</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{formatCurrency(s.monthlyAmount)}/mo</span>
                </div>
              ))}
              {subscriptions.length > 0 && (
                <p className="text-xs text-muted-foreground pt-1 text-right">
                  Total: {formatCurrency(
                    (subscriptions as { monthlyAmount: number }[]).reduce((s, x) => s + x.monthlyAmount, 0)
                  )}/month
                </p>
              )}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Row 5: Recent Transactions (full width) ── */}
      <SectionCard title="Recent Transactions">
        <div className="flex items-center justify-between -mt-1 mb-3">
          <p className="text-xs text-muted-foreground">Your last 6 transactions</p>
          <a href="/transactions" className="text-primary hover:text-primary/80 text-xs font-medium transition-colors">
            View all →
          </a>
        </div>
        {recentLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : recentTransactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">No transactions yet</p>
            <a href="/transactions" className="mt-3 inline-block bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-4 py-2 rounded-lg transition-colors">
              Add your first transaction
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
            {recentTransactions.map((t: Record<string, unknown>) => {
              const cat = t.category as { icon?: string } | null;
              return (
                <div key={t.id as string} className="flex items-center gap-3 py-2 border-b border-border last:border-0 sm:[&:nth-last-child(2)]:border-0">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-base shrink-0">
                    {cat?.icon ?? (t.type === 'income' ? 'ðŸ’°' : 'ðŸ’³')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{(t.merchant as string) || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{formatRelative(t.createdAt as string)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-500' : 'text-foreground'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount as number)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(t.date as string, 'dd MMM')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
