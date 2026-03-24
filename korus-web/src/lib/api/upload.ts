/**
 * Upload API Service
 * Handles image and file uploads to Cloudinary
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function getCSRFHeaders(): Promise<Record<string, string>> {
  try {
    let sessionId = typeof window !== 'undefined' ? sessionStorage.getItem('korus_session_id') : null;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      if (typeof window !== 'undefined') sessionStorage.setItem('korus_session_id', sessionId);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${API_BASE_URL}/api/auth/csrf`, {
      headers: { 'x-session-id': sessionId },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return {};

    const data = await response.json();
    return {
      'x-csrf-token': data.token,
      'x-session-id': sessionId,
    };
  } catch {
    return {};
  }
}

export interface UploadResponse {
  success: boolean;
  url: string;
  publicId: string;
}

export const uploadAPI = {
  async uploadImage(file: File, token: string): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const csrfHeaders = await getCSRFHeaders();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${API_BASE_URL}/api/upload/image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...csrfHeaders,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload image');
    }

    return response.json();
  },
};
