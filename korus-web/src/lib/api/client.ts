/**
 * API Client Configuration
 * Base configuration for all API requests to the Korus backend
 */

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

/**
 * Base fetch wrapper with error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  console.log('[API Client] Making request:', {
    url,
    method: fetchOptions.method || 'GET',
    hasToken: !!token,
    headers: { ...headers, Authorization: token ? 'Bearer ***' : undefined },
    body: fetchOptions.body
  });

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    console.log('[API Client] Got response:', {
      url,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    const isJSON = contentType?.includes('application/json');

    if (!response.ok) {
      const errorData = isJSON ? await response.json() : await response.text();
      console.error('[API Client] Request failed:', {
        url,
        status: response.status,
        statusText: response.statusText,
        errorData,
        errorDataString: JSON.stringify(errorData, null, 2)
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
