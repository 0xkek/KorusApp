import { Router } from 'express'
import { connectWallet, getProfile } from '../controllers/authController'
import { authenticate } from '../middleware/auth'

const router = Router()

// POST /api/auth/connect - Connect wallet and get JWT
router.post('/connect', connectWallet)

// GET /api/auth/profile - Get user profile (requires auth)
router.get('/profile', authenticate, getProfile)

export default router