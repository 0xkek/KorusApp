/**
 * Deep links.
 *
 * Two forms, both landing on the same screens:
 *   korus://post/<id>              — the app's own scheme
 *   https://korus.fun/post/<id>    — Android App Links, so a shared web link
 *                                    opens the app instead of the browser
 *
 * The https form pairs with the OG metadata the web app already serves, so a
 * link shared from mobile still previews correctly for people without the app.
 */

import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';

export interface DeepLinkTarget {
  type: 'post' | 'profile';
  id: string;
}

/**
 * Extracts a target from a URL, or null when it is not one we handle.
 *
 * The two forms parse differently, which is easy to get wrong:
 *   korus://post/<id>           -> hostname 'post',      path '<id>'
 *   https://korus.fun/post/<id> -> hostname 'korus.fun', path 'post/<id>'
 * so the kind comes from the hostname for the custom scheme and from the
 * first path segment for the web URL. Handling only the latter silently
 * breaks every korus:// link.
 */
export function parseDeepLink(url: string): DeepLinkTarget | null {
  try {
    const { hostname, path } = Linking.parse(url);
    const segments = (path ?? '').split('/').filter(Boolean);

    // Custom scheme: the kind is the host, the id is the whole path.
    const isKind = (value?: string | null) =>
      value === 'post' || value === 'profile' || value === 'user';

    let kind: string | undefined;
    let id: string | undefined;

    if (isKind(hostname)) {
      kind = hostname ?? undefined;
      id = segments[0];
    } else {
      [kind, id] = segments;
    }

    if (!kind || !id) return null;
    if (kind === 'post') return { type: 'post', id };
    // The web uses /profile/<wallet>; accept /user/ as well since older
    // shared links used it.
    if (kind === 'profile' || kind === 'user') return { type: 'profile', id };
    return null;
  } catch {
    return null;
  }
}

export function useDeepLinks(onOpen: (target: DeepLinkTarget) => void) {
  const handler = useRef(onOpen);
  handler.current = onOpen;

  useEffect(() => {
    // Cold start: the app was launched by the link.
    Linking.getInitialURL().then((url) => {
      if (!url) return;
      const target = parseDeepLink(url);
      if (target) handler.current(target);
    });

    // Warm: the app was already running.
    const sub = Linking.addEventListener('url', ({ url }) => {
      const target = parseDeepLink(url);
      if (target) handler.current(target);
    });

    return () => sub.remove();
  }, []);
}
