'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  /** Pixel size of the square badge mark. */
  size?: number;
  /** Show the "FinSight AI" wordmark beside the mark. */
  showWordmark?: boolean;
  /** Extra classes for the wordmark text (color/size). */
  wordmarkClassName?: string;
  className?: string;
}

/**
 * FinSight AI brand mark.
 *
 * A rounded badge with an indigo→violet→cyan gradient holding a rising
 * finance line that bursts into a 4-point AI spark at its peak — "insight"
 * (the growth) meeting "AI" (the spark). Ascending bars sit behind for depth.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  const grad = `lg-grad-${id}`;
  const spark = `lg-spark-${id}`;
  const glow = `lg-glow-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="FinSight AI"
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id={grad} x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2a2a2a" />
          <stop offset="0.5" stopColor="#171717" />
          <stop offset="1" stopColor="#0a0a0a" />
        </linearGradient>
        <linearGradient id={spark} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#a1a1aa" />
        </linearGradient>
        <filter id={glow} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.1" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Badge */}
      <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${grad})`} />
      {/* Soft top sheen */}
      <rect x="2" y="2" width="44" height="44" rx="13" fill="white" fillOpacity="0.04" />
      {/* Hairline border */}
      <rect x="2.5" y="2.5" width="43" height="43" rx="12.5" fill="none" stroke="white" strokeOpacity="0.12" />

      {/* Ascending bars (depth) */}
      <g fill="white" fillOpacity="0.18">
        <rect x="12" y="28" width="4.5" height="8" rx="2.25" />
        <rect x="21.75" y="23" width="4.5" height="13" rx="2.25" />
        <rect x="31.5" y="18" width="4.5" height="18" rx="2.25" />
      </g>

      {/* Rising insight line */}
      <path
        d="M12 31 L20 25 L27 29 L36 17"
        stroke="white"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${glow})`}
      />

      {/* AI spark at the peak */}
      <path
        d="M36 9 C36.4 13.2 37.8 14.6 42 15 C37.8 15.4 36.4 16.8 36 21 C35.6 16.8 34.2 15.4 30 15 C34.2 14.6 35.6 13.2 36 9 Z"
        fill={`url(#${spark})`}
      />
    </svg>
  );
}

export function Logo({ size = 32, showWordmark = true, wordmarkClassName, className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className={cn('font-bold tracking-tight', wordmarkClassName)}>
          Fin<span className="text-primary">Sight</span> AI
        </span>
      )}
    </div>
  );
}
