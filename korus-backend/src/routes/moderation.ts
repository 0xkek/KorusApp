import { Router } from 'express'
import { 
  hideContent,
  suspendUser,
  warnUser,
  unsuspendUser,
  getModerationDashboard,
  getModerationHistory
} from '../controllers/moderationController'
import { authenticate } from '../middleware/auth'
import { requireModerator } from '../middleware/authorize'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()

// All moderation endpoints require authentication AND moderator privileges

// POST /api/moderation/hide - Hide content (posts/replies)
router.post('/hide', authenticate, asyncHandler(requireModerator), hideContent)

// POST /api/moderation/suspend - Suspend user
router.post('/suspend', authenticate, asyncHandler(requireModerator), suspendUser)

// POST /api/moderation/warn - Warn user
router.post('/warn', authenticate, asyncHandler(requireModerator), warnUser)

// POST /api/moderation/unsuspend - Unsuspend user
router.post('/unsuspend', authenticate, asyncHandler(requireModerator), unsuspendUser)

// GET /api/moderation/dashboard - Get moderation dashboard data
router.get('/dashboard', authenticate, asyncHandler(requireModerator), getModerationDashboard)

// GET /api/moderation/history/:targetType/:targetId - Get moderation history
router.get('/history/:targetType/:targetId', authenticate, asyncHandler(requireModerator), getModerationHistory)

export default router