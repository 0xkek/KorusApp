import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userWallet?: string
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  // Get JWT secret - NEVER use fallback in production
  const jwtSecret = process.env.JWT_SECRET
  
  if (!jwtSecret) {
    console.error('CRITICAL: JWT_SECRET not configured in auth middleware')
    // In production, fail fast
    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
    return res.status(500).json({ error: 'Server configuration error' })
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as { walletAddress: string }
    req.userWallet = decoded.walletAddress
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}
