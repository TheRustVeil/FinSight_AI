'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

interface DateRange {
  startDate: string;
  endDate: string;
  label: string;
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

function getMonthRange(date: Date): DateRange {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    label: start.toLocaleString('default', { month: 'long', year: 'numeric' }),
  };
}

export function currentMonthRange(): DateRange {
  return getMonthRange(new Date());
}

export function DateRangePicker({ value, onChange }: Props) {
  const [current, setCurrent] = useState(() => {
    const d = new Date(value.startDate);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  function shift(direction: -1 | 1) {
    const next = new Date(current.getFullYear(), current.getMonth() + direction, 1);
    setCurrent(next);
    onChange(getMonthRange(next));
  }

  const isCurrentMonth =
    current.getMonth() === new Date().getMonth() &&
    current.getFullYear() === new Date().getFullYear();

  return (
    <div className="flex items-center gap-1 bg-card border border-border rounded-lg px-2 py-1.5">
      <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
      <button
        onClick={() => shift(-1)}
        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm font-medium text-foreground min-w-[140px] text-center">{value.label}</span>
      <button
        onClick={() => shift(1)}
        disabled={isCurrentMonth}
        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
