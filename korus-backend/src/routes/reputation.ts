import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import {
  getUserReputation,
  getLeaderboard,
  recordDailyLogin,
} from '../controllers/reputationController'

const router = Router()

// Get user reputation
router.get('/users/:walletAddress', getUserReputation)

// Get leaderboard
router.get('/leaderboard', getLeaderboard)

// Record daily login (requires auth)
router.post('/daily-login', authenticate, recordDailyLogin)

export default router