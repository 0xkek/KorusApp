import { Router } from 'express'
import { authenticate } from '../middleware/auth'
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

// POST /api/sponsored/create - Create a sponsored post campaign
router.post('/create', authenticate, createSponsoredPost)

// GET /api/sponsored - Get active sponsored posts
router.get('/', sponsoredTrackingLimiter, getSponsoredPosts)

// POST /api/sponsored/:postId/view - Track a view
router.post('/:postId/view', validateSponsoredView, sponsoredTrackingLimiter, trackView)

// POST /api/sponsored/:postId/click - Track a click
router.post('/:postId/click', validateSponsoredView, sponsoredTrackingLimiter, trackClick)

// GET /api/sponsored/revenue - Get revenue stats (admin only)
router.get('/revenue', authenticate, getRevenueStats)

export default router