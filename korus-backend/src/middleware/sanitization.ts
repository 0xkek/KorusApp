import { Request, Response, NextFunction } from 'express'
import { body, validationResult } from 'express-validator'

// HTML tags that are allowed in post content
const ALLOWED_TAGS: string[] = []  // No HTML allowed by default

// Sanitize a string to prevent XSS
export const sanitizeString = (input: string): string => {
  if (!input) return ''
  
  // HTML escape function
  let sanitized = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
  
  // Remove any potential script injections
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  sanitized = sanitized.replace(/javascript:/gi, '')
  sanitized = sanitized.replace(/on\w+\s*=/gi, '') // Remove event handlers
  
  // Trim whitespace
  sanitized = sanitized.trim()
  
  return sanitized
}

// Middleware to sanitize request body
export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    // List of fields that should NOT be sanitized (URLs, etc.)
    const skipFields = ['imageUrl', 'videoUrl', 'website', 'avatar', 'nftAvatar', 'url', 'link'];
    
    // Recursively sanitize all string values in the body
    const sanitizeObject = (obj: any, path: string = ''): any => {
      if (typeof obj === 'string') {
        // Check if current field should be skipped
        const fieldName = path.split('.').pop() || '';
        if (skipFields.includes(fieldName)) {
          return obj; // Don't sanitize URLs
        }
        return sanitizeString(obj)
      } else if (Array.isArray(obj)) {
        return obj.map((item, index) => sanitizeObject(item, `${path}[${index}]`))
      } else if (obj !== null && typeof obj === 'object') {
        const sanitized: any = {}
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            sanitized[key] = sanitizeObject(obj[key], path ? `${path}.${key}` : key)
          }
        }
        return sanitized
      }
      return obj
    }
    
    req.body = sanitizeObject(req.body)
  }
  next()
}

// Validation rules for posts
export const validatePost = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Post content must be between 1 and 5000 characters')
    .customSanitizer((value) => sanitizeString(value)),
  body('topic')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Topic must be less than 50 characters')
    .customSanitizer((value) => sanitizeString(value)),
  body('subtopic')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Subtopic must be less than 100 characters')
    .customSanitizer((value) => sanitizeString(value)),
  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('Invalid image URL'),
  body('videoUrl')
    .optional()
    .isURL()
    .withMessage('Invalid video URL'),
]

// Validation rules for replies
export const validateReply = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Reply content must be between 1 and 2000 characters')
    .customSanitizer((value) => sanitizeString(value)),
]

// Validation rules for user profiles
export const validateProfile = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Display name must be less than 50 characters')
    .customSanitizer((value) => sanitizeString(value)),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters')
    .customSanitizer((value) => sanitizeString(value)),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location must be less than 100 characters')
    .customSanitizer((value) => sanitizeString(value)),
  body('website')
    .optional()
    .trim()
    .isURL()
    .withMessage('Invalid website URL'),
  body('twitter')
    .optional()
    .trim()
    .matches(/^@?[A-Za-z0-9_]{1,15}$/)
    .withMessage('Invalid Twitter handle'),
]

// Middleware to check validation results
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array() 
    })
  }
  next()
}

// SQL injection prevention for dynamic queries
export const sanitizeSqlInput = (input: string): string => {
  if (!input) return ''
  
  // Remove or escape SQL special characters
  let sanitized = input.replace(/['";\\]/g, '')
  
  // Remove SQL keywords that could be used for injection
  const sqlKeywords = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE',
    'ALTER', 'UNION', 'EXEC', 'EXECUTE', '--', '/*', '*/'
  ]
  
  sqlKeywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi')
    sanitized = sanitized.replace(regex, '')
  })
  
  return sanitized.trim()
}