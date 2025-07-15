import { Router } from 'express'
import { bumpPost, createPost, getPosts, getSinglePost } from '../controllers/postsController'
import { authenticate } from '../middleware/auth'

const router = Router()

// GET /api/posts - Get chronological feed with bump logic
router.get('/', getPosts)

// GET /api/posts/:id - Get single post with replies
router.get('/:id', getSinglePost)

// POST /api/posts - Create new post (requires auth)
router.post('/', authenticate, createPost)

// PUT /api/posts/:id/bump - Bump post for 5 minutes (requires auth)
router.put('/:id/bump', authenticate, bumpPost)

export default router