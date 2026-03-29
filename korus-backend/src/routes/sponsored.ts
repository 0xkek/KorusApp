import { Router, Response, NextFunction } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import {
  createSponsoredPost,
  getSponsoredPosts,
  trackView,
  trackClick,
  getRevenueStats
} from '../controllers/sponsoredController'
import { sponsoredTrackingLimiter } from '../middleware/rateLimiter'
import { validateSponsoredView } from '../middleware/validation'

const router = Router()

const ADMIN_WALLETS = [
  'G4WAtEdLYWpDoxNWKVbd2Pv9LoX2feFSxN7mWUXt3kGG',
  '5S2AgyEURGvr4f4Lk3AJ6ei9U6RTzh2AthQiRwHWsV2L'
]

// POST /api/sponsored/create - Create a sponsored post campaign
router.post('/create', authenticate, createSponsoredPost)

// GET /api/sponsored - Get active sponsored posts
router.get('/', sponsoredTrackingLimiter, getSponsoredPosts)

// POST /api/sponsored/:postId/view - Track a view
router.post('/:postId/view', validateSponsoredView, sponsoredTrackingLimiter, trackView)

// POST /api/sponsored/:postId/click - Track a click
router.post('/:postId/click', validateSponsoredView, sponsoredTrackingLimiter, trackClick)

// GET /api/sponsored/revenue - Get revenue stats (admin only)
router.get('/revenue', authenticate, (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.userWallet || !ADMIN_WALLETS.includes(req.userWallet)) {
    return res.status(403).json({ success: false, error: 'Admin access required' })
  }
  next()
}, getRevenueStats)

export default router