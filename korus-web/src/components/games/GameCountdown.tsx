'use client';

import { useState, useEffect } from 'react';

interface GameCountdownProps {
  expiresAt: string | null;
  onExpire?: () => void;
}

export function GameCountdown({ expiresAt, onExpire }: GameCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const difference = expiry - now;

      if (difference <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
        if (onExpire && !isExpired) {
          onExpire();
        }
        return;
      }

      // Calculate hours, minutes, and seconds
      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire, isExpired]);

  if (!expiresAt) return null;

  if (isExpired) {
    return (
      <div className="text-xs text-red-400 font-semibold">
        ⏱️ Expired
      </div>
    );
  }

  return (
    <div className="text-xs text-yellow-400 font-semibold">
      ⏱️ {timeLeft}
    </div>
  );
}
