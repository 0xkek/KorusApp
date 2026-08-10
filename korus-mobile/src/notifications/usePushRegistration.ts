/**
 * Registering this device for push notifications.
 *
 * Expo push tokens are minted by Expo's servers from an EAS projectId, so this
 * cannot work until the project has been linked with `eas init`. Rather than
 * crash or spam errors when that is missing, registration no-ops and reports
 * why — the in-app notification list keeps working regardless.
 */

import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { notificationsAPI } from '../api/notifications';

// Show notifications while the app is foregrounded; without this Android
// silently swallows them when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushStatus =
  | 'idle'
  | 'unsupported'
  | 'no-project-id'
  | 'denied'
  | 'registered'
  | 'error';

function getProjectId(): string | null {
  const fromExtra = Constants.expoConfig?.extra?.eas?.projectId;
  const fromEas = (Constants as unknown as { easConfig?: { projectId?: string } })
    .easConfig?.projectId;
  return (fromExtra as string) ?? fromEas ?? null;
}

export function usePushRegistration(token: string | null) {
  const [status, setStatus] = useState<PushStatus>('idle');
  // Avoids re-registering the same token on every auth state change.
  const registered = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      registered.current = null;
      setStatus('idle');
      return;
    }

    let cancelled = false;

    (async () => {
      // Push does not work on simulators/emulators.
      if (!Device.isDevice) {
        if (!cancelled) setStatus('unsupported');
        return;
      }

      const projectId = getProjectId();
      // Logged because this silently determines whether push works at all, and
      // a wrong or missing id is otherwise indistinguishable from a delivery
      // problem further down the chain.
      console.log('[push] projectId:', projectId ?? 'MISSING');
      if (!projectId) {
        // Expected until `eas init` has been run. Not an error worth shouting
        // about — the notification list still works by polling.
        if (!cancelled) setStatus('no-project-id');
        return;
      }

      try {
        // Android needs an explicit channel or notifications are silent.
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Korus',
            importance: Notifications.AndroidImportance.DEFAULT,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          });
        }

        const existing = await Notifications.getPermissionsAsync();
        let granted = existing.granted;
        if (!granted && existing.canAskAgain) {
          const asked = await Notifications.requestPermissionsAsync();
          granted = asked.granted;
        }
        if (!granted) {
          if (!cancelled) setStatus('denied');
          return;
        }

        const expoToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log('[push] token:', expoToken);
        if (cancelled || registered.current === expoToken) return;

        await notificationsAPI.registerPushToken(expoToken, token);
        console.log('[push] registered with backend');
        registered.current = expoToken;
        if (!cancelled) setStatus('registered');
      } catch (err) {
        console.log('[push] failed:', err instanceof Error ? err.message : String(err));
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return status;
}

/**
 * Tapping a notification should open what it refers to. Returns the payload
 * of a tap, whether the app was running or launched by it.
 */
export function useNotificationTap(
  onOpen: (data: { type?: string; postId?: string | null; fromUserId?: string }) => void
) {
  const handler = useRef(onOpen);
  handler.current = onOpen;

  useEffect(() => {
    // App was launched by tapping a notification while it was closed.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      const data = response?.notification.request.content.data;
      if (data) handler.current(data as never);
    });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data) handler.current(data as never);
    });
    return () => sub.remove();
  }, []);
}
