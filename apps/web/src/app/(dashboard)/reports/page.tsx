'use client';

import { useState } from 'react';
import { Download, FileText, FileJson, Loader2, TrendingUp, TrendingDown, PiggyBank, Receipt } from 'lucide-react';
import { useSummaryReport, useExportReport } from '@/hooks/useReports';
import { DateRangePicker, currentMonthRange } from '@/components/shared/DateRangePicker';
import { formatCurrency, formatCompact } from '@/lib/formatters';

interface DateRange { startDate: string; endDate: string; label: string; }

interface CategoryRow {
  category: { name: string; icon?: string; color?: string };
  total: number;
  count: number;
  percentage: number;
}

interface MonthRow { month: string; income: number; expense: number; net: number; }
interface MerchantRow { merchant: string; total: number; count: number; }

interface SummaryReport {
  period: { startDate: string; endDate: string };
  summary: {
    totalIncome: number;
    totalExpense: number;
    netSavings: number;
    savingsRate: number;
    transactionCount: number;
    avgTransaction: number;
  };
  byCategory: CategoryRow[];
  byMonth: MonthRow[];
  topMerchants: MerchantRow[];
  generatedAt: string;
}

const FALLBACK_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#f97316', '#8b5cf6', '#14b8a6'];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>(currentMonthRange);
  const params = { startDate: dateRange.startDate, endDate: dateRange.endDate };
  const { data, isLoading } = useSummaryReport(params);
  const { exportFile, isExporting } = useExportReport();

  const report = data as SummaryReport | undefined;
  const s = report?.summary;

  return (
    <div className="space-y-6 animate-fade-in pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Financial summary for {dateRange.label}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <button
            onClick={() => exportFile('csv', params)}
            disabled={isExporting === 'csv'}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted text-foreground transition-colors disabled:opacity-50"
          >
            {isExporting === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            CSV
          </button>
          <button
            onClick={() => exportFile('json', params)}
            disabled={isExporting === 'json'}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm transition-colors disabled:opacity-50"
          >
            {isExporting === 'json' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
            JSON
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-card border border-border rounded-xl animate-pulse" />)}
          </div>
          <div className="h-64 bg-card border border-border rounded-xl animate-pulse" />
        </div>
      ) : !report ? null : (
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Income" value={s!.totalIncome} icon={TrendingUp} color="text-green-500" bg="bg-green-500/10" />
            <StatCard label="Total Expenses" value={s!.totalExpense} icon={TrendingDown} color="text-red-500" bg="bg-red-500/10" />
            <StatCard
              label="Net Savings"
              value={s!.netSavings}
              icon={PiggyBank}
              color={s!.netSavings >= 0 ? 'text-green-500' : 'text-red-500'}
              bg={s!.netSavings >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}
              subtitle={`${s!.savingsRate}% savings rate`}
            />
            <StatCard
              label="Transactions"
              value={s!.transactionCount}
              icon={Receipt}
              color="text-primary"
              bg="bg-primary/10"
              isCurrency={false}
              subtitle={`avg ${formatCurrency(s!.avgTransaction)}`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Category breakdown */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-semibold text-foreground mb-4">Expenses by Category</h2>
              {report.byCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No expenses in this period</p>
              ) : (
                <div className="space-y-3">
                  {report.byCategory.map((c, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1 text-sm">
                        <span className="font-medium text-foreground">{c.category.icon} {c.category.name}</span>
                        <span className="text-muted-foreground">{formatCurrency(c.total)} · {c.percentage}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-700"
                          style={{ width: `${c.percentage}%`, backgroundColor: c.category.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length] }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top merchants */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-semibold text-foreground mb-4">Top Merchants</h2>
              {report.topMerchants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No merchant data</p>
              ) : (
                <div className="space-y-2.5">
                  {report.topMerchants.map((m, i) => (
                    <div key={m.merchant} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5 text-center">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{m.merchant}</p>
                        <p className="text-xs text-muted-foreground">{m.count} transactions</p>
                      </div>
                      <span className="text-sm font-semibold text-foreground shrink-0">{formatCurrency(m.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Monthly breakdown table */}
          {report.byMonth.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-5 border-b border-border">
                <h2 className="font-semibold text-foreground">Monthly Breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left">
                      <th className="px-5 py-3 font-medium text-muted-foreground">Month</th>
                      <th className="px-5 py-3 font-medium text-muted-foreground text-right">Income</th>
                      <th className="px-5 py-3 font-medium text-muted-foreground text-right">Expenses</th>
                      <th className="px-5 py-3 font-medium text-muted-foreground text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byMonth.map((m) => (
                      <tr key={m.month} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-5 py-3 font-medium text-foreground">{m.month}</td>
                        <td className="px-5 py-3 text-right text-green-500">{formatCurrency(m.income)}</td>
                        <td className="px-5 py-3 text-right text-red-500">{formatCurrency(m.expense)}</td>
                        <td className={`px-5 py-3 text-right font-semibold ${m.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {m.net >= 0 ? '+' : ''}{formatCurrency(m.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-right">
            Report generated {new Date(report.generatedAt).toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, bg, subtitle, isCurrency = true }: {
  label: string; value: number; icon: React.ElementType; color: string; bg: string; subtitle?: string; isCurrency?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{isCurrency ? formatCompact(value) : value.toLocaleString()}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}
