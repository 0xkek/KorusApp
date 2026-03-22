/**
 * API Client Configuration
 * Base configuration for all API requests to the Korus backend
 */

import { logger } from '@/utils/logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
}

// CSRF token cache
let csrfToken: string | null = null;
let sessionId: string | null = null;

function getSessionId(): string {
  if (sessionId) return sessionId;
  // Generate a stable session ID per browser session
  if (typeof window !== 'undefined') {
    sessionId = sessionStorage.getItem('korus_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('korus_session_id', sessionId);
    }
  } else {
    sessionId = crypto.randomUUID();
  }
  return sessionId;
}

async function fetchCSRFToken(): Promise<string> {
  if (csrfToken) return csrfToken;

  const sid = getSessionId();
  const response = await fetch(`${API_BASE_URL}/api/auth/csrf`, {
    headers: { 'x-session-id': sid },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch CSRF token');
  }

  const data = await response.json();
  csrfToken = data.token;
  return csrfToken!;
}

/**
 * Base fetch wrapper with error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;
  const method = fetchOptions.method || 'GET';
  const isStateChanging = method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add CSRF headers for state-changing requests
  if (isStateChanging) {
    try {
      const csrf = await fetchCSRFToken();
      headers['x-csrf-token'] = csrf;
      headers['x-session-id'] = getSessionId();
    } catch (e) {
      logger.error('[API Client] Failed to get CSRF token:', e);
    }
  }

  const url = `${API_BASE_URL}${endpoint}`;

  logger.log('[API Client] Making request:', {
    url,
    method,
    hasToken: !!token,
  });

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    logger.log('[API Client] Got response:', {
      url,
      status: response.status,
      ok: response.ok
    });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    const isJSON = contentType?.includes('application/json');

    if (!response.ok) {
      // If CSRF token was rejected, clear cache and retry once
      if (response.status === 403 && isStateChanging) {
        const errorData = isJSON ? await response.json() : await response.text();
        const errorMsg = typeof errorData === 'string' ? errorData : errorData?.error || '';
        if (errorMsg.includes('CSRF')) {
          csrfToken = null; // Clear cached token
          const newCsrf = await fetchCSRFToken();
          headers['x-csrf-token'] = newCsrf;
          // Retry the request
          const retryResponse = await fetch(url, { ...fetchOptions, headers });
          if (retryResponse.ok) {
            const retryContentType = retryResponse.headers.get('content-type');
            if (retryResponse.status === 204 || !retryContentType?.includes('application/json')) {
              return {} as T;
            }
            return await retryResponse.json();
          }
        }
      }

      const errorData = isJSON ? await response.json() : await response.text();
      logger.error('[API Client] Request failed:', {
        url,
        status: response.status,
        error: typeof errorData === 'string' ? errorData : errorData?.message || errorData?.error,
      });
      throw new APIError(
        typeof errorData === 'string' ? errorData : errorData.message || errorData.error || 'API request failed',
        response.status,
        errorData
      );
    }

    // Return parsed JSON or empty object for no-content responses
    if (response.status === 204 || !isJSON) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    // Network or other errors
    throw new APIError(
      error instanceof Error ? error.message : 'Network error',
      0,
      error
    );
  }
}

export const api = {
  get: <T>(endpoint: string, token?: string) =>
    apiRequest<T>(endpoint, {
      method: 'GET',
      token,
      cache: 'no-store' // Prevent browser caching of GET requests
    }),

  post: <T>(endpoint: string, data?: unknown, token?: string) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      token,
    }),

  put: <T>(endpoint: string, data?: unknown, token?: string) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      token,
    }),

  delete: <T>(endpoint: string, token?: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE', token }),
};
