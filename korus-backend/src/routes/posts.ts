import { Router } from 'express'
import { createPost, getPosts, getSinglePost } from '../controllers/postsController'
import { authenticate } from '../middleware/auth'
import { createPostLimiter } from '../middleware/rateLimiter'
import { validateCreatePost, validateGetPosts } from '../middleware/validation'
import { checkSuspension, checkWarnings } from '../middleware/moderationCheck'

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
router.get('/', validateGetPosts, getPosts)

// GET /api/posts/:id - Get single post with replies
router.get('/:id', getSinglePost)

// POST /api/posts - Create new post (requires auth + moderation check + rate limiting + validation)
router.post('/', authenticate, checkSuspension, checkWarnings, createPostLimiter, validateCreatePost, createPost)

export default router