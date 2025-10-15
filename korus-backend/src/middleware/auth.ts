import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { logger } from '../utils/logger'

export interface AuthRequest extends Request {
  userWallet?: string
  rateLimit?: {
    multiplier: number
  }
}

// Validate JWT_SECRET at module load time (server startup)
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  logger.error('CRITICAL: JWT_SECRET environment variable is not configured');
  if (process.env.NODE_ENV === 'production') {
    logger.error('Server cannot start without JWT_SECRET in production');
    process.exit(1);
  } else {
    logger.warn('WARNING: JWT_SECRET not set. Authentication will fail.');
  }
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  // JWT secret was validated at startup - safe to use non-null assertion
  if (!jwtSecret) {
    // This should never happen if validation at startup worked
    logger.error('CRITICAL: JWT_SECRET missing during request processing');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as { walletAddress: string }
    req.userWallet = decoded.walletAddress
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}
