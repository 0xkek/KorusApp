import { Router } from 'express'
import { createReply, getReplies, likeReply } from '../controllers/repliesController'
import { authenticate } from '../middleware/auth'

const router = Router()

// POST /api/posts/:id/replies - Create reply to post
router.post('/:id/replies', authenticate, createReply)

// GET /api/posts/:id/replies - Get replies for post  
router.get('/:id/replies', getReplies)

// POST /api/replies/:id/like - Like/unlike a reply
router.post('/:id/like', authenticate, likeReply)

export default router