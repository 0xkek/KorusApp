import { Router } from 'express'
import { createPost, getPosts, getSinglePost } from '../controllers/postsController'
import { authenticate } from '../middleware/auth'
import { validateCreatePost, validateGetPosts } from '../middleware/validation'
import { checkSuspension, checkWarnings } from '../middleware/moderationCheck'
import { createPostRateLimiter, readPostsRateLimiter, burstProtection } from '../middleware/advancedRateLimiter'

const router = Router()

// TEST endpoint - simple check
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Posts route is working',
    timestamp: new Date().toISOString()
  })
})

// GET /api/posts - Get chronological feed
router.get('/', burstProtection, readPostsRateLimiter, validateGetPosts, getPosts)

// GET /api/posts/:id - Get single post with replies
router.get('/:id', readPostsRateLimiter, getSinglePost)

// POST /api/posts - Create new post (requires auth + moderation check + rate limiting + validation)
router.post('/', authenticate, checkSuspension, checkWarnings, burstProtection, createPostRateLimiter, validateCreatePost, createPost)

export default router