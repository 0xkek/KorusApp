'use client';

import { useEffect, useState } from 'react';
import { useWalletAuth } from '@/contexts/WalletAuthContext';
import { notificationsAPI } from '@/lib/api/notifications';
import {
  isPushSupported,
  getPermission,
  subscribeToPush,
  unsubscribeFromPush,
  hasActiveSubscription,
} from '@/lib/webPush';

/**
 * Opt-in toggle for browser notifications. Renders nothing unless the browser
 * supports push and the server has VAPID keys configured, so an unconfigured
 * deploy shows no dead control.
 */
export default function PushNotificationToggle() {
  const { token, isAuthenticated } = useWalletAuth();
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isPushSupported()) return;
      try {
        const { enabled: serverReady } = await notificationsAPI.getPushPublicKey();
        if (cancelled || !serverReady) return;
        setAvailable(true);
        setDenied(getPermission() === 'denied');
        setEnabled(await hasActiveSubscription());
      } catch {
        // Server unreachable or push unconfigured — leave the toggle hidden.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!available || !isAuthenticated) return null;

  const handleToggle = async (next: boolean) => {
    if (!token || isBusy) return;
    setIsBusy(true);
    try {
      const ok = next ? await subscribeToPush(token) : await unsubscribeFromPush(token);
      if (ok) setEnabled(next);
      if (next && !ok) setDenied(getPermission() === 'denied');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white/[0.04] rounded-xl border border-[var(--color-border-light)]">
      <div className="pr-4">
        <div className="text-[var(--color-text)] font-medium">Browser Notifications</div>
        <div className="text-[var(--color-text-secondary)] text-sm">
          {denied
            ? 'Blocked — enable notifications for korus.fun in your browser settings'
            : 'Get notified about likes, replies, tips and follows when Korus is closed'}
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          disabled={isBusy || denied}
          onChange={(e) => handleToggle(e.target.checked)}
          className="sr-only"
          aria-label="Toggle browser notifications"
          role="switch"
          aria-checked={enabled}
        />
        <div className={`toggle-switch ${enabled ? 'toggle-switch-active' : 'toggle-switch-inactive'}`}>
          <div className={`toggle-switch-thumb ${enabled ? 'toggle-switch-thumb-active' : ''}`}></div>
        </div>
      </label>
    </div>
  );
}
