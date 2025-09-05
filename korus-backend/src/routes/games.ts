import { Router } from 'express'
import { 
  createGame, 
  joinGame, 
  makeMove, 
  getGame, 
  getGameByPostId 
} from '../controllers/gamesController'
import { authenticate } from '../middleware/auth'
import { requireTokenFeatures } from '../middleware/tokenFeatures'
import { gameLimiter } from '../middleware/rateLimiter'

const router = Router()

// Apply rate limiting to all game routes
router.use(gameLimiter)

// All game routes require authentication

// POST /api/games - Create a new game (requires tokens for wagers)
router.post('/', authenticate, requireTokenFeatures, createGame)

// POST /api/games/:id/join - Join an existing game (requires tokens for wagers)
router.post('/:id/join', authenticate, requireTokenFeatures, joinGame)

// POST /api/games/:id/move - Make a move in the game
router.post('/:id/move', authenticate, makeMove)

// GET /api/games/:id - Get game by ID
router.get('/:id', getGame)

// GET /api/games/post/:postId - Get game by post ID
router.get('/post/:postId', getGameByPostId)

export default router