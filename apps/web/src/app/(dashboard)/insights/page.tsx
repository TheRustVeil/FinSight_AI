'use client';

import { AlertTriangle, TrendingUp, RefreshCw, X, CheckCheck, Loader2, Info, Zap, Lightbulb, BarChart3, Repeat2 } from 'lucide-react';
import {
  useInsights,
  useSpendingForecast,
  useGenerateInsights,
  useDismissInsight,
  useMarkAllRead,
  useMarkInsightRead,
} from '@/hooks/useInsights';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { formatCompact, formatCurrency } from '@/lib/formatters';

// ── Severity config ───────────────────────────────────────────────────────────

const SEV_MAP = {
  alert:   { color: 'text-red-500',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    Icon: AlertTriangle },
  warning: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', Icon: Zap },
  info:    { color: 'text-blue-500',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   Icon: Info },
};

const TYPE_ICON: Record<string, React.ElementType> = {
  spending_spike:        AlertTriangle,
  forecast:              BarChart3,
  savings_opportunity:   Lightbulb,
  subscription_detected: Repeat2,
  recommendation:        TrendingUp,
  comparison:            BarChart3,
  anomaly:               Zap,
};

// ── Insight card ─────────────────────────────────────────────────────────────

interface InsightItem {
  id: string;
  type: string;
  title: string;
  body: string;
  severity: 'alert' | 'warning' | 'info';
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

function InsightCard({ insight }: { insight: InsightItem }) {
  const sev = SEV_MAP[insight.severity] ?? SEV_MAP.info;
  const TypeIcon = TYPE_ICON[insight.type] ?? Info;
  const dismiss = useDismissInsight();
  const markRead = useMarkInsightRead();

  return (
    <div
      className={`relative bg-card border rounded-xl p-5 transition-all ${sev.border} ${!insight.isRead ? 'ring-1 ring-white/20' : ''}`}
      onMouseEnter={() => { if (!insight.isRead) markRead.mutate(insight.id); }}
    >
      {/* Unread dot */}
      {!insight.isRead && (
        <span className="absolute top-4 right-10 w-2 h-2 rounded-full bg-primary" />
      )}

      {/* Dismiss */}
      <button
        onClick={() => dismiss.mutate(insight.id)}
        className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex gap-4">
        <div className={`w-10 h-10 rounded-xl ${sev.bg} flex items-center justify-center shrink-0`}>
          <TypeIcon className={`w-5 h-5 ${sev.color}`} />
        </div>
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground text-sm">{insight.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sev.bg} ${sev.color} capitalize`}>
              {insight.severity}
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{insight.body}</p>
        </div>
      </div>
    </div>
  );
}

// ── Forecast chart ────────────────────────────────────────────────────────────

interface ForecastMonth { label: string; actual?: number; forecast?: number; }

function ForecastChart({ data }: { data: ForecastMonth[] }) {
  function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-xl text-sm">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground capitalize">{p.name}:</span>
            <span className="font-medium text-foreground">{formatCompact(p.value)}</span>
          </div>
        ))}
      </div>
    );
  }

  const splitIdx = data.findIndex((d) => d.forecast !== undefined);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={55} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} formatter={(v) => <span style={{ color: 'hsl(var(--muted-foreground))' }}>{v}</span>} />
        {splitIdx > 0 && <ReferenceLine x={data[splitIdx - 1]?.label} stroke="hsl(var(--border))" strokeDasharray="4 4" label={{ value: 'Forecast →', position: 'insideTopRight', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />}
        <Bar dataKey="actual" name="Actual" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Line dataKey="forecast" name="Forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#f59e0b', r: 4 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const { data: insights = [], isLoading } = useInsights();
  const { data: forecast, isLoading: forecastLoading } = useSpendingForecast();
  const generate = useGenerateInsights();
  const markAllRead = useMarkAllRead();

  const list = insights as InsightItem[];
  const unread = list.filter((i) => !i.isRead).length;

  const bySeverity = {
    alert:   list.filter((i) => i.severity === 'alert'),
    warning: list.filter((i) => i.severity === 'warning'),
    info:    list.filter((i) => i.severity === 'info'),
  };

  return (
    <div className="space-y-6 animate-fade-in pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Insights
            {unread > 0 && <span className="ml-2 text-sm font-normal text-primary">{unread} new</span>}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">AI-generated observations about your financial patterns</p>
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
          <button
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm transition-colors"
          >
            {generate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Generate Insights
          </button>
        </div>
      </div>

      {/* Spending Forecast Chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold text-foreground mb-1">6-Month Spending + 3-Month Forecast</h2>
        <p className="text-xs text-muted-foreground mb-4">Actual spending (bars) with weighted moving average forecast (dashed line)</p>
        {forecastLoading ? (
          <div className="h-56 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : forecast ? (
          <>
            <ForecastChart data={(forecast as { months: ForecastMonth[] }).months} />
            <p className="text-xs text-muted-foreground mt-3 text-right">
              Forecasted monthly spend: <span className="font-medium text-foreground">{formatCurrency((forecast as { wma: number }).wma)}</span>
            </p>
          </>
        ) : null}
      </div>

      {/* Insights list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-card border border-border rounded-xl animate-pulse" />)}
        </div>
      ) : !list.length ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">No insights yet</h3>
          <p className="text-muted-foreground text-sm mb-5">Click "Generate Insights" to analyse your financial data</p>
          <button
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 mx-auto transition-colors"
          >
            {generate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Analyse My Finances
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {bySeverity.alert.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-red-500 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Action Required ({bySeverity.alert.length})
              </h2>
              <div className="space-y-3">
                {bySeverity.alert.map((i) => <InsightCard key={i.id} insight={i} />)}
              </div>
            </section>
          )}

          {bySeverity.warning.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-yellow-500 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Heads Up ({bySeverity.warning.length})
              </h2>
              <div className="space-y-3">
                {bySeverity.warning.map((i) => <InsightCard key={i.id} insight={i} />)}
              </div>
            </section>
          )}

          {bySeverity.info.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-blue-500 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" /> Observations ({bySeverity.info.length})
              </h2>
              <div className="space-y-3">
                {bySeverity.info.map((i) => <InsightCard key={i.id} insight={i} />)}
              </div>
            </section>
          )}
        </div>
      )}

      {generate.isSuccess && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm shadow-lg flex items-center gap-2 animate-fade-in">
          <CheckCheck className="w-4 h-4" />
          {(generate.data as { generated: number }).generated} insights generated
        </div>
      )}
    </div>
  );
}
