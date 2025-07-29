import { Router } from 'express'
import { connectWallet, getProfile } from '../controllers/authController'
import { authenticate } from '../middleware/auth'
import { validateWalletConnect } from '../middleware/validation'
import { authLimiter } from '../middleware/rateLimiter'

const router = Router()

// Wrapper to handle async errors in Express
const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// POST /api/auth/connect - Connect wallet and get JWT
router.post('/connect', validateWalletConnect, asyncHandler(connectWallet))

// GET /api/auth/profile - Get user profile (requires auth)
router.get('/profile', authenticate, asyncHandler(getProfile))

// TEST: Direct connect without validation
router.post('/connect-test', asyncHandler(async (req: any, res: any) => {
  console.log('TEST ENDPOINT HIT')
  console.log('Body:', req.body)
  res.json({ success: true, message: 'Test endpoint reached' })
}))

export default router