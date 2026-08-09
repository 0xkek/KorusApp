/**
 * API client for the Korus backend.
 *
 * Mirrors korus-web/src/lib/api/client.ts. The backend's CSRF protection is
 * header-based (x-session-id + x-csrf-token), not cookie-based, so a native
 * client satisfies it exactly the same way a browser does — no backend change
 * was needed for mobile.
 */

import * as Crypto from 'expo-crypto';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://korus-backend.onrender.com';

let sessionId: string | null = null;
let csrfToken: string | null = null;

/** Stable per-app-run session id, paired with the CSRF token by the backend. */
function getSessionId(): string {
  if (!sessionId) {
    sessionId = Crypto.randomUUID();
  }
  return sessionId;
}

async function fetchCSRFToken(): Promise<string> {
  if (csrfToken) return csrfToken;

  const response = await fetch(`${API_BASE_URL}/api/auth/csrf`, {
    headers: { 'x-session-id': getSessionId() },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CSRF token (${response.status})`);
  }

  const data = (await response.json()) as { token: string };
  csrfToken = data.token;
  return csrfToken;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  token?: string | null;
  body?: unknown;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
  // Internal: set when replaying a request after a rejected CSRF token, to
  // guarantee we never loop.
  isCsrfRetry = false
): Promise<T> {
  const { token, body, ...rest } = options;
  const method = (rest.method ?? 'GET').toUpperCase();
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((rest.headers as Record<string, string>) ?? {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (isStateChanging) {
    headers['x-csrf-token'] = await fetchCSRFToken();
    headers['x-session-id'] = getSessionId();
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...rest,
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      (data && (data.error?.message ?? data.error ?? data.message)) ||
      `Request failed (${response.status})`;
    const messageText = typeof message === 'string' ? message : JSON.stringify(message);

    // The CSRF token is cached for the life of the app run, so a server
    // restart or expiry would otherwise wedge every write until the app is
    // relaunched. Drop the cached token and replay once.
    if (isStateChanging && !isCsrfRetry && response.status === 403 && /csrf/i.test(messageText)) {
      csrfToken = null;
      return apiRequest<T>(endpoint, options, true);
    }

    throw new Error(messageText);
  }

  return data as T;
}

export const api = {
  get: <T>(endpoint: string, token?: string | null) =>
    apiRequest<T>(endpoint, { method: 'GET', token }),
  post: <T>(endpoint: string, body?: unknown, token?: string | null) =>
    apiRequest<T>(endpoint, { method: 'POST', body, token }),
  put: <T>(endpoint: string, body?: unknown, token?: string | null) =>
    apiRequest<T>(endpoint, { method: 'PUT', body, token }),
  delete: <T>(endpoint: string, token?: string | null) =>
    apiRequest<T>(endpoint, { method: 'DELETE', token }),
};
