import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import helmet from 'helmet'

// CSRF Token management
const csrfTokens = new Map<string, { token: string; expires: number }>()

export const generateCSRFToken = (sessionId: string): string => {
  const token = crypto.randomBytes(32).toString('hex')
  const expires = Date.now() + (4 * 60 * 60 * 1000) // 4 hours
  csrfTokens.set(sessionId, { token, expires })
  
  // Cleanup expired tokens
  for (const [key, value] of csrfTokens.entries()) {
    if (value.expires < Date.now()) {
      csrfTokens.delete(key)
    }
  }
  
  return token
}

export const validateCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET requests
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next()
  }

  const sessionId = req.headers['x-session-id'] as string
  const providedToken = req.headers['x-csrf-token'] as string

  if (!sessionId || !providedToken) {
    return res.status(403).json({ error: 'CSRF token required' })
  }

  const storedData = csrfTokens.get(sessionId)
  
  if (!storedData || storedData.expires < Date.now() || storedData.token !== providedToken) {
    return res.status(403).json({ error: 'Invalid or expired CSRF token' })
  }

  next()
}

// Security headers configuration (similar to Twitter)
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "wss:", "https:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
})

// Request ID for tracking (like Twitter's x-request-id)
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = crypto.randomUUID()
  req.headers['x-request-id'] = requestId
  res.setHeader('x-request-id', requestId)
  next()
}

// Enhanced rate limiting based on Twitter's model
export const createAdvancedRateLimiter = (options: {
  windowMs: number
  maxRequests: number
  identifier: (req: Request) => string
}) => {
  const requests = new Map<string, { count: number; resetTime: number }>()

  return (req: Request, res: Response, next: NextFunction) => {
    const key = options.identifier(req)
    const now = Date.now()
    
    const userData = requests.get(key)
    
    if (!userData || userData.resetTime < now) {
      requests.set(key, {
        count: 1,
        resetTime: now + options.windowMs
      })
      
      res.setHeader('X-Rate-Limit-Limit', options.maxRequests.toString())
      res.setHeader('X-Rate-Limit-Remaining', (options.maxRequests - 1).toString())
      res.setHeader('X-Rate-Limit-Reset', new Date(now + options.windowMs).toISOString())
      
      return next()
    }
    
    if (userData.count >= options.maxRequests) {
      res.setHeader('X-Rate-Limit-Limit', options.maxRequests.toString())
      res.setHeader('X-Rate-Limit-Remaining', '0')
      res.setHeader('X-Rate-Limit-Reset', new Date(userData.resetTime).toISOString())
      res.setHeader('Retry-After', Math.ceil((userData.resetTime - now) / 1000).toString())
      
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil((userData.resetTime - now) / 1000)} seconds`,
        resetTime: new Date(userData.resetTime).toISOString()
      })
    }
    
    userData.count++
    res.setHeader('X-Rate-Limit-Limit', options.maxRequests.toString())
    res.setHeader('X-Rate-Limit-Remaining', (options.maxRequests - userData.count).toString())
    res.setHeader('X-Rate-Limit-Reset', new Date(userData.resetTime).toISOString())
    
    next()
  }
}