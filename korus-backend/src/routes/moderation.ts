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

const router = Router()

// All moderation endpoints require authentication
// In production, you'd add role-based authorization middleware here

// POST /api/moderation/hide - Hide content (posts/replies)
router.post('/hide', authenticate, hideContent)

// POST /api/moderation/suspend - Suspend user
router.post('/suspend', authenticate, suspendUser)

// POST /api/moderation/warn - Warn user
router.post('/warn', authenticate, warnUser)

// POST /api/moderation/unsuspend - Unsuspend user
router.post('/unsuspend', authenticate, unsuspendUser)

// GET /api/moderation/dashboard - Get moderation dashboard data
router.get('/dashboard', authenticate, getModerationDashboard)

// GET /api/moderation/history/:targetType/:targetId - Get moderation history
router.get('/history/:targetType/:targetId', authenticate, getModerationHistory)

export default router