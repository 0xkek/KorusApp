'use client';

import { useState, useEffect } from 'react';

interface EventCountdownProps {
  startDate: string;
  endDate: string;
  /** Compact mode for event cards (just text), full mode for detail page (with labels) */
  variant?: 'compact' | 'full';
}

function formatCountdown(ms: number): { text: string; days: number; hours: number; minutes: number; seconds: number } {
  if (ms <= 0) return { text: 'Ended', days: 0, hours: 0, minutes: 0, seconds: 0 };

  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  let text = '';
  if (days > 0) text = `${days}d ${hours}h ${minutes}m`;
  else if (hours > 0) text = `${hours}h ${minutes}m ${seconds}s`;
  else text = `${minutes}m ${seconds}s`;

  return { text, days, hours, minutes, seconds };
}

/** Live-ticking countdown for the 12h early access window */
export function EarlyAccessCountdown({ createdAt, earlyAccessHours = 12 }: { createdAt: string; earlyAccessHours?: number }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const created = new Date(createdAt);
  const earlyAccessEnd = new Date(created.getTime() + earlyAccessHours * 60 * 60 * 1000);
  const diff = earlyAccessEnd.getTime() - now.getTime();

  if (diff <= 0) return null;

  const { text } = formatCountdown(diff);
  return <>{text}</>;
}

export default function EventCountdown({ startDate, endDate, variant = 'compact' }: EventCountdownProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const start = new Date(startDate);
  const end = new Date(endDate);

  const isLive = now >= start && now <= end;
  const isUpcoming = now < start;
  const isEnded = now > end;

  if (variant === 'compact') {
    if (isEnded) return <span>Ended</span>;
    if (isLive) {
      const remaining = formatCountdown(end.getTime() - now.getTime());
      return <span>Ends in {remaining.text}</span>;
    }
    // Upcoming
    const remaining = formatCountdown(start.getTime() - now.getTime());
    return <span>Starts in {remaining.text}</span>;
  }

  // Full variant for detail page
  if (isEnded) {
    return (
      <div className="bg-[var(--color-surface-light)] rounded-xl p-4 border border-[var(--color-border-light)] text-center">
        <div className="text-[var(--color-text-tertiary)] text-xs mb-1">Status</div>
        <div className="text-[var(--color-text-secondary)] font-semibold text-sm">Event Ended</div>
      </div>
    );
  }

  const label = isLive ? 'Ends In' : 'Starts In';
  const targetMs = isLive ? end.getTime() - now.getTime() : start.getTime() - now.getTime();
  const { days, hours, minutes, seconds } = formatCountdown(targetMs);

  return (
    <div className="bg-[var(--color-surface-light)] rounded-xl p-4 border border-[var(--color-border-light)]">
      <div className="text-[var(--color-text-tertiary)] text-xs mb-2 flex items-center gap-1.5">
        {isLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
        {label}
      </div>
      <div className="flex items-center gap-1.5">
        {days > 0 && (
          <>
            <div className="bg-white/[0.06] rounded-lg px-2 py-1 text-center min-w-[36px]">
              <div className="text-[var(--color-text)] font-bold text-lg leading-tight">{days}</div>
              <div className="text-[var(--color-text-tertiary)] text-[10px]">d</div>
            </div>
            <span className="text-[var(--color-text-tertiary)] font-bold">:</span>
          </>
        )}
        <div className="bg-white/[0.06] rounded-lg px-2 py-1 text-center min-w-[36px]">
          <div className="text-[var(--color-text)] font-bold text-lg leading-tight">{String(hours).padStart(2, '0')}</div>
          <div className="text-[var(--color-text-tertiary)] text-[10px]">h</div>
        </div>
        <span className="text-[var(--color-text-tertiary)] font-bold">:</span>
        <div className="bg-white/[0.06] rounded-lg px-2 py-1 text-center min-w-[36px]">
          <div className="text-[var(--color-text)] font-bold text-lg leading-tight">{String(minutes).padStart(2, '0')}</div>
          <div className="text-[var(--color-text-tertiary)] text-[10px]">m</div>
        </div>
        <span className="text-[var(--color-text-tertiary)] font-bold">:</span>
        <div className="bg-white/[0.06] rounded-lg px-2 py-1 text-center min-w-[36px]">
          <div className="text-[var(--color-text)] font-bold text-lg leading-tight">{String(seconds).padStart(2, '0')}</div>
          <div className="text-[var(--color-text-tertiary)] text-[10px]">s</div>
        </div>
      </div>
    </div>
  );
}
