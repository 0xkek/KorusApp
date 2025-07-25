import { Router } from 'express'
import { createPost, getPosts, getSinglePost } from '../controllers/postsController'
import { authenticate } from '../middleware/auth'
import { createPostLimiter } from '../middleware/rateLimiter'
import { validateCreatePost, validateGetPosts } from '../middleware/validation'

const router = Router()

// GET /api/posts - Get chronological feed
router.get('/', validateGetPosts, getPosts)

// GET /api/posts/:id - Get single post with replies
router.get('/:id', getSinglePost)

// POST /api/posts - Create new post (requires auth + rate limiting + validation)
router.post('/', authenticate, createPostLimiter, validateCreatePost, createPost)

export default router