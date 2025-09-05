import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { requireTokenFeatures } from '../middleware/tokenFeatures'
import { 
  getMyDistributions,
  getWeeklyLeaderboard,
  claimTokens,
  getCurrentPoolStatus
} from '../controllers/distributionController'

const router = Router()

// GET /api/distribution/my - Get user's distribution history
router.get('/my', authenticate, requireTokenFeatures, getMyDistributions)

// GET /api/distribution/leaderboard - Get weekly leaderboard
router.get('/leaderboard', requireTokenFeatures, getWeeklyLeaderboard)

// GET /api/distribution/pool - Get current pool status
router.get('/pool', requireTokenFeatures, getCurrentPoolStatus)

// POST /api/distribution/claim - Claim tokens for a specific week
router.post('/claim', authenticate, requireTokenFeatures, claimTokens)

export default router