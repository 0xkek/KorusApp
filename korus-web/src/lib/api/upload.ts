/**
 * Upload API Service
 * Handles image and file uploads to Cloudinary
 */

import { api } from './client';

export interface UploadResponse {
  success: boolean;
  url: string;
  publicId: string;
}

export const uploadAPI = {
  /**
   * Upload an image file to Cloudinary
   */
  async uploadImage(file: File, token: string): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/upload/image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload image');
    }

    return response.json();
  },
};
