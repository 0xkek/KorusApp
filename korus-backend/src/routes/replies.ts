import { Router } from 'express'
import { createReply, getReplies, likeReply } from '../controllers/repliesController'
import { authenticate } from '../middleware/auth'
import { validateCreateReply, validateLike } from '../middleware/validation'
import { checkSuspension, checkWarnings } from '../middleware/moderationCheck'
import { createReplyRateLimiter, readPostsRateLimiter, interactionsRateLimiter, burstProtection } from '../middleware/advancedRateLimiter'

const router = Router()

// POST /api/posts/:id/replies - Create reply to post
router.post('/:id/replies', authenticate, checkSuspension, checkWarnings, burstProtection, createReplyRateLimiter, validateCreateReply, createReply)

// GET /api/posts/:id/replies - Get replies for post  
router.get('/:id/replies', readPostsRateLimiter, getReplies)

// POST /api/replies/:id/like - Like/unlike a reply
router.post('/:id/like', authenticate, interactionsRateLimiter, validateLike, likeReply)

export default router