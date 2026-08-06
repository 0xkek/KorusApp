import { notificationsAPI } from '@/lib/api/notifications';
import { logger } from '@/utils/logger';

/**
 * Browser push subscription helpers.
 *
 * Note on reach: iOS Safari only delivers web push to sites installed to the
 * home screen as a PWA. Desktop browsers and Android Chrome work normally.
 */

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

// VAPID keys are base64url; the Push API wants a Uint8Array.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/sw.js');
  if (existing) return existing;
  return navigator.serviceWorker.register('/sw.js');
}

/**
 * Prompt for permission and register a subscription.
 * Returns false (without throwing) if unsupported, denied, or unconfigured.
 */
export async function subscribeToPush(token: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const { publicKey, enabled } = await notificationsAPI.getPushPublicKey();
    if (!enabled || !publicKey) {
      logger.log('Web push not configured on the server');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const registration = await registerServiceWorker();
    await navigator.serviceWorker.ready;

    // Reuse an existing subscription when present — re-subscribing with a
    // different key throws in some browsers.
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }

    await notificationsAPI.subscribeToPush(subscription.toJSON(), token);
    return true;
  } catch (error) {
    logger.error('Failed to subscribe to push:', error);
    return false;
  }
}

export async function unsubscribeFromPush(token: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();

    await notificationsAPI.unsubscribeFromPush(token);
    return true;
  } catch (error) {
    logger.error('Failed to unsubscribe from push:', error);
    return false;
  }
}

/** True when this browser currently holds an active subscription. */
export async function hasActiveSubscription(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted') return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    return !!(await registration?.pushManager.getSubscription());
  } catch {
    return false;
  }
}
