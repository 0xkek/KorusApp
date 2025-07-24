import { Router } from 'express'
import { createPost, getPosts, getSinglePost } from '../controllers/postsController'
import { authenticate } from '../middleware/auth'

const router = Router()

// GET /api/posts - Get chronological feed
router.get('/', getPosts)

// GET /api/posts/:id - Get single post with replies
router.get('/:id', getSinglePost)

// POST /api/posts - Create new post (requires auth)
router.post('/', authenticate, createPost)

export default router