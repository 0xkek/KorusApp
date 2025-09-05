import { Request, Response, NextFunction } from 'express';
import { TOKEN_CONFIG } from '../config/constants';

/**
 * Middleware to check if token features are enabled
 * Returns a friendly message if tokens are disabled
 */
export function requireTokenFeatures(req: Request, res: Response, next: NextFunction) {
  if (!TOKEN_CONFIG.ENABLE_TOKEN_FEATURES) {
    return res.status(503).json({
      success: false,
      message: 'Token features are temporarily disabled',
      info: 'ALLY token distribution coming soon!',
      comingSoon: true
    });
  }
  next();
}

/**
 * Check if token features are enabled (for conditional logic)
 */
export function areTokenFeaturesEnabled(): boolean {
  return TOKEN_CONFIG.ENABLE_TOKEN_FEATURES;
}