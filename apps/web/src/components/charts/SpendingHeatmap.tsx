'use client';

import { formatCurrency } from '@/lib/formatters';

interface HeatmapEntry {
  date: string;
  amount: number;
}

interface Props {
  data: HeatmapEntry[];
  year: number;
  month: number;
}

function getIntensity(amount: number, max: number): string {
  if (amount === 0 || max === 0) return 'bg-muted';
  const ratio = amount / max;
  if (ratio < 0.2) return 'bg-primary/15';
  if (ratio < 0.4) return 'bg-primary/35';
  if (ratio < 0.6) return 'bg-primary/55';
  if (ratio < 0.8) return 'bg-primary/75';
  return 'bg-primary';
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function SpendingHeatmap({ data, year, month }: Props) {
  const amountMap: Record<string, number> = {};
  for (const d of data) amountMap[d.date] = d.amount;

  const maxAmount = Math.max(...data.map((d) => d.amount), 1);

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDow = firstDay.getDay(); // 0=Sun

  const cells: { date: string | null; amount: number }[] = [];
  for (let i = 0; i < startDow; i++) cells.push({ date: null, amount: 0 });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ date: dateStr, amount: amountMap[dateStr] ?? 0 });
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAY_LABELS.map((d) => (
          <span key={d} className="text-xs text-muted-foreground font-medium py-1">{d}</span>
        ))}
        {cells.map((cell, i) => (
          <div
            key={i}
            title={cell.date ? `${cell.date}: ${cell.amount > 0 ? formatCurrency(cell.amount) : 'No spending'}` : ''}
            className={`aspect-square rounded-md text-xs flex items-center justify-center font-medium transition-colors ${
              !cell.date ? 'invisible' : `cursor-default ${getIntensity(cell.amount, maxAmount)}`
            } ${cell.amount > 0 ? (cell.amount / maxAmount >= 0.55 ? 'text-primary-foreground' : 'text-foreground') : 'text-muted-foreground'}`}
          >
            {cell.date ? parseInt(cell.date.split('-')[2]) : ''}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 justify-end mt-1">
        <span className="text-xs text-muted-foreground">Less</span>
        {['bg-muted', 'bg-primary/15', 'bg-primary/35', 'bg-primary/55', 'bg-primary/75', 'bg-primary'].map((c, i) => (
          <div key={i} className={`w-4 h-4 rounded-sm border border-border ${c}`} />
        ))}
        <span className="text-xs text-muted-foreground">More</span>
      </div>
    </div>
  );
}
