'use client';

import { useState, useEffect } from 'react';

interface ShoutoutCountdownProps {
  startTime: number; // timestamp in milliseconds
  duration: number; // duration in minutes
  onExpire?: () => void;
}

export default function ShoutoutCountdown({ startTime, duration, onExpire }: ShoutoutCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const updateTimeLeft = () => {
      const now = Date.now();
      const endTime = startTime + (duration * 60 * 1000); // Convert minutes to milliseconds
      const remaining = Math.max(0, endTime - now);

      setTimeLeft(remaining);

      if (remaining === 0 && onExpire) {
        onExpire();
      }
    };

    // Update immediately
    updateTimeLeft();

    // Update every second
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [startTime, duration, onExpire]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="flex items-center gap-2 text-black">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="font-bold text-sm">
        {timeLeft > 0 ? formatTime(timeLeft) : 'EXPIRED'}
      </span>
    </div>
  );
}
