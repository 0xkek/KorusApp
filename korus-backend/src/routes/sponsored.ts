import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { 
  createSponsoredPost, 
  getSponsoredPosts, 
  trackView, 
  trackClick,
  getRevenueStats 
} from '../controllers/sponsoredController'

const router = Router()

// POST /api/sponsored/create - Create a sponsored post campaign
router.post('/create', authenticate, createSponsoredPost)

// GET /api/sponsored - Get active sponsored posts
router.get('/', getSponsoredPosts)

// POST /api/sponsored/:postId/view - Track a view
router.post('/:postId/view', trackView)

// POST /api/sponsored/:postId/click - Track a click
router.post('/:postId/click', trackClick)

// GET /api/sponsored/revenue - Get revenue stats (admin only)
router.get('/revenue', authenticate, getRevenueStats)

export default router