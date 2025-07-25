import { Router } from 'express'
import { 
  createGame, 
  joinGame, 
  makeMove, 
  getGame, 
  getGameByPostId 
} from '../controllers/gamesController'
import { authenticate } from '../middleware/auth'

const router = Router()

// All game routes require authentication

// POST /api/games - Create a new game
router.post('/', authenticate, createGame)

// POST /api/games/:id/join - Join an existing game
router.post('/:id/join', authenticate, joinGame)

// POST /api/games/:id/move - Make a move in the game
router.post('/:id/move', authenticate, makeMove)

// GET /api/games/:id - Get game by ID
router.get('/:id', getGame)

// GET /api/games/post/:postId - Get game by post ID
router.get('/post/:postId', getGameByPostId)

export default router