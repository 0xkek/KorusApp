import { Router } from 'express'
import { connectWallet, connectWalletSimple, getProfile } from '../controllers/authController'
import { authenticate } from '../middleware/auth'
import { validateWalletConnect } from '../middleware/validation'
import { authLimiter } from '../middleware/rateLimiter'

const router = Router()

// POST /api/auth/connect - Connect wallet and get JWT
router.post('/connect', validateWalletConnect, connectWallet)

// POST /api/auth/connect-simple - Simple wallet connect for hackathon (no signature verification)
router.post('/connect-simple', connectWalletSimple)

// GET /api/auth/profile - Get user profile (requires auth)
router.get('/profile', authenticate, getProfile)

export default router