import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import cloudinary from '../config/cloudinary'
import { logger } from '../utils/logger'

export const uploadImage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      })
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'korus-posts',
          allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          max_file_size: 10485760, // 10MB
          resource_type: 'image'
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )

      uploadStream.end(req.file!.buffer)
    })

    const uploadResult = result as any

    logger.debug(`Image uploaded to Cloudinary: ${uploadResult.secure_url}`)

    res.json({
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id
    })
  } catch (error) {
    logger.error('Image upload error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to upload image'
    })
  }
}
