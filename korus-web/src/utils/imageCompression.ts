/**
 * Image Compression Utility
 * Compresses images before upload to improve performance
 */

import imageCompression from 'browser-image-compression';
import { logger } from './logger';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  fileType?: string;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg',
};

/**
 * Compress an image file
 * @param file - The image file to compress
 * @param options - Optional compression settings
 * @returns Compressed file
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  try {
    const originalSizeMB = file.size / 1024 / 1024;

    logger.log(`🖼️ Compressing image: ${file.name} (${originalSizeMB.toFixed(2)}MB)`);

    const compressedFile = await imageCompression(file, mergedOptions);
    const compressedSizeMB = compressedFile.size / 1024 / 1024;

    logger.log(
      `✅ Compressed: ${originalSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB ` +
      `(${((1 - compressedSizeMB / originalSizeMB) * 100).toFixed(0)}% reduction)`
    );

    return compressedFile;
  } catch (error) {
    logger.error('❌ Image compression failed:', error);
    logger.log('⚠️ Using original file');
    return file; // Return original if compression fails
  }
}

/**
 * Compress multiple image files
 * @param files - Array of image files
 * @param options - Optional compression settings
 * @returns Array of compressed files
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<File[]> {
  return Promise.all(files.map(file => compressImage(file, options)));
}
