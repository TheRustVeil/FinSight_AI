'use client';

import { CountUp } from './CountUp';

const BARS = [42, 58, 35, 70, 48, 82, 63, 90, 55, 74, 60, 96];

const ROWS = [
  ['Jun 24', 'Food', 'Swiggy', '−$38.00', 'Settled'],
  ['Jun 23', 'Transport', 'Uber', '−$12.50', 'Settled'],
  ['Jun 22', 'Subscription', 'Netflix', '−$15.99', 'Pending'],
];

/** Animated, "alive" dashboard preview for the hero. */
export function HeroPreview() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-xl shadow-black/[0.04] overflow-hidden animate-float">
      {/* Title bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/40">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-border" />
          <span className="w-2.5 h-2.5 rounded-full bg-border" />
          <span className="w-2.5 h-2.5 rounded-full bg-border" />
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary animate-pulse-ring" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="label-mono">Live</span>
        </div>
        <span className="w-10" />
      </div>

      <div className="p-5">
        {/* Stat tiles with count-up */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total spent', node: <CountUp to={4821} prefix="$" /> },
            { label: 'Budgets', node: <CountUp to={8} suffix=" active" /> },
            { label: 'Pending', node: <CountUp to={3} /> },
            { label: 'Goals met', node: <CountUp to={5} /> },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border p-3">
              <div className="label-mono mb-1.5">{s.label}</div>
              <div className="text-lg font-semibold tracking-tight tabular-nums">{s.node}</div>
            </div>
          ))}
        </div>

        {/* Self-drawing chart + growing bars */}
        <div className="relative h-32 mb-5 rounded-lg border border-border bg-muted/20 px-3 pt-3">
          <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-1.5 h-20">
            {BARS.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-primary/15 origin-bottom animate-grow-up"
                style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }}
              />
            ))}
          </div>
          <svg viewBox="0 0 320 96" preserveAspectRatio="none" className="absolute inset-x-3 bottom-3 w-[calc(100%-1.5rem)] h-20 overflow-visible">
            <defs>
              <linearGradient id="heroLine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 78 L29 64 L58 70 L87 44 L116 52 L145 30 L174 38 L203 20 L232 30 L261 14 L290 22 L320 6 L320 96 L0 96 Z"
              fill="url(#heroLine)"
            />
            <path
              d="M0 78 L29 64 L58 70 L87 44 L116 52 L145 30 L174 38 L203 20 L232 30 L261 14 L290 22 L320 6"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              className="animate-draw"
              style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
            />
          </svg>
        </div>

        {/* Transaction rows, staggered in */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-5 px-4 py-2 border-b border-border bg-muted/40">
            {['Date', 'Category', 'Merchant', 'Amount', 'Status'].map((h) => (
              <span key={h} className="label-mono">{h}</span>
            ))}
          </div>
          {ROWS.map(([date, cat, mer, amt, status], i) => (
            <div
              key={mer}
              className="grid grid-cols-5 px-4 py-2.5 text-sm border-b border-border last:border-0 animate-fade-up"
              style={{ animationDelay: `${900 + i * 160}ms` }}
            >
              <span className="text-muted-foreground">{date}</span>
              <span className="text-muted-foreground">{cat}</span>
              <span className="text-foreground">{mer}</span>
              <span className="text-foreground font-medium tabular-nums">{amt}</span>
              <span className={status === 'Settled' ? 'text-primary text-xs font-medium' : 'text-muted-foreground text-xs font-medium'}>{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
