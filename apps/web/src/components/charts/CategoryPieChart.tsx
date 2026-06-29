'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/formatters';

interface Category {
  category: { name: string; icon?: string; color?: string } | null;
  total: number;
  percentage: number;
}

interface Props {
  data: Category[];
}

const FALLBACK_COLORS = ['#e4e4e7', '#22c55e', '#f59e0b', '#60a5fa', '#a78bfa', '#f472b6', '#34d399'];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: Category }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="font-semibold text-foreground">{d.category?.icon} {d.category?.name ?? 'Unknown'}</p>
      <p className="text-muted-foreground mt-1">{formatCurrency(d.total)} · {d.percentage}%</p>
    </div>
  );
}

export function CategoryPieChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
        No expense data for this period
      </div>
    );
  }

  const top = data.slice(0, 6);

  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={top}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
            dataKey="total"
          >
            {top.map((entry, i) => (
              <Cell key={i} fill={entry.category?.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="space-y-2">
        {top.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: item.category?.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length] }}
            />
            <span className="text-foreground flex-1 truncate">{item.category?.icon} {item.category?.name ?? 'Unknown'}</span>
            <span className="text-muted-foreground text-xs">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
