import express from 'express'
import multer from 'multer'
import { authenticate } from '../middleware/auth'
import { uploadImage } from '../controllers/uploadController'

const router = express.Router()

// Configure multer for memory storage
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  }
})

// Upload image endpoint (requires authentication)
router.post('/image', authenticate, upload.single('file'), uploadImage)

export default router
