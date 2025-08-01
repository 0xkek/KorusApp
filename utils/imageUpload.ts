import { logger } from './logger';

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dldke4tjm';
const CLOUDINARY_UPLOAD_PRESET = 'korus-hackathon';

interface UploadResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export const uploadToCloudinary = async (imageUri: string): Promise<string> => {
  try {
    logger.info('Starting image upload to Cloudinary');
    
    // Create form data
    const formData = new FormData();
    
    // For React Native, we need to format the file properly
    const file = {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any;
    
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'korus-posts');
    
    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }
    
    const data: UploadResponse = await response.json();
    logger.info('Image uploaded successfully', { 
      url: data.secure_url,
      size: data.bytes,
      dimensions: `${data.width}x${data.height}`
    });
    
    return data.secure_url;
  } catch (error) {
    logger.error('Failed to upload image to Cloudinary:', error);
    throw new Error('Failed to upload image. Please try again.');
  }
};

// Helper to validate image before upload
export const validateImage = (imageUri: string): boolean => {
  // Basic validation - you can add more checks
  if (!imageUri || !imageUri.startsWith('file://')) {
    logger.error('Invalid image URI:', imageUri);
    return false;
  }
  return true;
};

// Helper to get image size in MB
export const getImageSizeMB = async (imageUri: string): Promise<number> => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    return blob.size / (1024 * 1024); // Convert to MB
  } catch (error) {
    logger.error('Failed to get image size:', error);
    return 0;
  }
};