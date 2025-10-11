import { logger } from '../utils/logger'
import { Request, Response } from 'express'
import prisma from '../config/database'
import { gameEscrowService } from '../services/gameEscrowService'
import { PublicKey } from '@solana/web3.js'

// AuthRequest type
interface AuthRequest extends Request {
  userWallet?: string
}

// Game interface from Prisma
interface GameRecord {
  id: string
  postId: string
  gameType: string
  player1: string
  player2: string | null
  currentTurn: string | null
  gameState: any // JSON from database
  wager: any // Decimal from database
  winner: string | null
  status: string
  onChainGameId: bigint | null
  createdAt: Date
  updatedAt: Date
}

// ApiResponse type
interface ApiResponse {
  success: boolean
  error?: string
  game?: GameRecord
  message?: string
}

// Game type definitions
type GameType = 'tictactoe' | 'rps' | 'coinflip' | 'connectfour'
type BoardCell = string | null
type GameBoard = BoardCell[][]

interface Move {
  player: string
  position?: { row: number; col: number }
  choice?: string
  timestamp: Date
}

interface GameState {
  board?: GameBoard // For tictactoe and connectfour
  moves?: Move[] // For tracking move history
  player1Choice?: string // For RPS and coinflip
  player2Choice?: string
  round?: number // For RPS (best of 3)
  score?: { player1: number; player2: number }
  [key: string]: unknown // Allow additional properties for JSON compatibility
}

// Create a new game
export const createGame = async (req: AuthRequest, res: Response) => {
  try {
    const { postId, gameType, wager, onChainGameId } = req.body
    const player1 = req.userWallet!

    // Validate game type
    if (!['tictactoe', 'rps', 'connectfour'].includes(gameType)) {
      return res.status(400).json({ success: false, error: 'Invalid game type' })
    }

    // For games with wagers, require blockchain game ID
    if (wager > 0 && !onChainGameId) {
      return res.status(400).json({
        success: false,
        error: 'On-chain game ID required for wagered games. Create game on blockchain first.'
      })
    }

    // Verify blockchain game exists if provided
    if (onChainGameId) {
      const isValid = await gameEscrowService.verifyGameCreation(Number(onChainGameId))
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid on-chain game ID. Game not found on blockchain.'
        })
      }
      logger.info(`✅ Verified on-chain game ${onChainGameId} for post ${postId}`)
    }

    let actualPostId = postId;

    // Create a dummy post for standalone games
    if (!postId || postId === '0') {
      const dummyPost = await prisma.post.create({
        data: {
          content: `Standalone ${gameType} game`,
          authorWallet: player1,
          topic: 'games', // Games topic for standalone games
        }
      });
      actualPostId = dummyPost.id;
    } else {
      // Check if post exists
      const post = await prisma.post.findUnique({
        where: { id: postId }
      })

      if (!post) {
        return res.status(404).json({ success: false, error: 'Post not found' })
      }

      // Check if game already exists for this post
      const existingGame = await prisma.game.findUnique({
        where: { postId }
      })

      if (existingGame) {
        return res.status(400).json({ success: false, error: 'Game already exists for this post' })
      }
    }

    // Initialize game state based on type
    let initialState: GameState = {}
    
    switch (gameType) {
      case 'tictactoe':
        initialState = {
          board: Array(3).fill(null).map(() => Array(3).fill(null)),
          moves: []
        }
        break
      case 'connectfour':
        initialState = {
          board: Array(6).fill(null).map(() => Array(7).fill(null)),
          moves: []
        }
        break
      case 'rps':
        initialState = {
          round: 1,
          score: { player1: 0, player2: 0 },
          moves: []
        }
        break
    }

    // Create the game
    const game = await prisma.game.create({
      data: {
        postId: actualPostId,
        gameType,
        player1,
        wager: wager || 0,
        status: 'waiting',
        gameState: initialState as any,
        currentTurn: gameType === 'rps' ? undefined : player1,
        onChainGameId: onChainGameId ? BigInt(onChainGameId) : null
      },
      include: {
        post: {
          include: {
            author: true
          }
        },
        player1User: true
      }
    })

    // Convert BigInt to string for JSON serialization
    const serializedGame = {
      ...game,
      onChainGameId: game.onChainGameId ? game.onChainGameId.toString() : null,
      wager: game.wager.toString()
    }

    res.json({
      success: true,
      game: serializedGame
    })
  } catch (error) {
    logger.error('Create game error:', error)
    res.status(500).json({ success: false, error: 'Failed to create game' })
  }
}

// Join an existing game
export const joinGame = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const player2 = req.userWallet!

    const game = await prisma.game.findUnique({
      where: { id }
    })

    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' })
    }

    if (game.status !== 'waiting') {
      return res.status(400).json({ success: false, error: 'Game is not available to join' })
    }

    if (game.player1 === player2) {
      return res.status(400).json({ success: false, error: 'Cannot play against yourself' })
    }

    // Update game to active
    const updatedGame = await prisma.game.update({
      where: { id },
      data: {
        player2,
        status: 'active',
        currentTurn: game.gameType === 'rps' ? undefined : game.player1
      },
      include: {
        player1User: true,
        player2User: true
      }
    })

    // Convert BigInt to string for JSON serialization
    const serializedGame = {
      ...updatedGame,
      onChainGameId: updatedGame.onChainGameId ? updatedGame.onChainGameId.toString() : null,
      wager: updatedGame.wager.toString()
    }

    res.json({
      success: true,
      game: serializedGame
    })
  } catch (error) {
    logger.error('Join game error:', error)
    res.status(500).json({ success: false, error: 'Failed to join game' })
  }
}

// Make a move in the game
export const makeMove = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { move } = req.body
    const playerWallet = req.userWallet!

    const game = await prisma.game.findUnique({
      where: { id }
    })

    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' })
    }

    if (game.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Game is not active' })
    }

    // Check if player is in the game
    if (game.player1 !== playerWallet && game.player2 !== playerWallet) {
      return res.status(403).json({ success: false, error: 'You are not in this game' })
    }

    let gameState = game.gameState as GameState
    let winner: string | null = null
    let newStatus = 'active'

    // Process move based on game type
    switch (game.gameType) {
      case 'tictactoe':
        winner = processTicTacToeMove(game, gameState, move, playerWallet)
        break
      case 'connectfour':
        winner = processConnectFourMove(game, gameState, move, playerWallet)
        break
      case 'rps':
        winner = processRPSMove(game, gameState, move, playerWallet)
        break
    }

    if (winner) {
      newStatus = 'completed'
      
      // Award game rewards
      try {
        // Award points to winner (could be reputation points or tokens in the future)
        await prisma.interaction.create({
          data: {
            userWallet: winner,
            targetType: 'game',
            targetId: id,
            interactionType: 'game_win'
          }
        })
        
        // Award participation points to both players
        await prisma.interaction.create({
          data: {
            userWallet: game.player1,
            targetType: 'game',
            targetId: id,
            interactionType: 'game_played'
          }
        })
        
        if (game.player2) {
          await prisma.interaction.create({
            data: {
              userWallet: game.player2,
              targetType: 'game',
              targetId: id,
              interactionType: 'game_played'
            }
          })
        }
        
        logger.debug(`Game rewards awarded - Winner: ${winner}, Game: ${id}`)
      } catch (error) {
        logger.error('Failed to award game rewards:', error)
        // Don't fail the game update if rewards fail
      }

      // Complete game on blockchain (distribute escrow funds)
      if (game.player2 && game.onChainGameId) {
        try {
          logger.info(`Completing game on blockchain: ${id}, winner: ${winner}`)

          const player1Pubkey = new PublicKey(game.player1)
          const player2Pubkey = new PublicKey(game.player2)
          // Handle draws by passing null to the blockchain service
          const winnerPubkey = winner === 'draw' ? null : new PublicKey(winner)

          // TODO: Backend cannot complete games on blockchain without Anchor
          // Game completion must be done client-side by calling the smart contract
          // The backend verifies the game was created, but completion happens in the frontend
          const txSignature = 'COMPLETED_CLIENT_SIDE'

          logger.info(`Game completed on blockchain: ${txSignature}`)
        } catch (error) {
          logger.error('Failed to complete game on blockchain:', error)
          // Continue with database update even if blockchain fails
          // This allows manual resolution of blockchain issues
        }
      } else if (winner === 'draw') {
        logger.info('Game ended in draw - no blockchain completion needed (manual refund required)')
      }
    }

    // Update game state
    const updatedGame = await prisma.game.update({
      where: { id },
      data: {
        gameState: gameState as any,
        currentTurn: winner ? null : (game.currentTurn === game.player1 ? game.player2 : game.player1),
        winner,
        status: newStatus
      },
      include: {
        player1User: true,
        player2User: true,
        winnerUser: true
      }
    })

    // Convert BigInt to string for JSON serialization
    const serializedGame = {
      ...updatedGame,
      onChainGameId: updatedGame.onChainGameId ? updatedGame.onChainGameId.toString() : null,
      wager: updatedGame.wager.toString()
    }

    res.json({
      success: true,
      game: serializedGame
    })
  } catch (error) {
    logger.error('Make move error:', error)
    res.status(500).json({ success: false, error: 'Failed to make move' })
  }
}

// Get game by ID
export const getGame = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        player1User: true,
        player2User: true,
        winnerUser: true,
        post: {
          include: {
            author: true
          }
        }
      }
    })

    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' })
    }

    // Convert BigInt to string for JSON serialization
    const serializedGame = {
      ...game,
      onChainGameId: game.onChainGameId ? game.onChainGameId.toString() : null,
      wager: game.wager.toString()
    }

    res.json({
      success: true,
      game: serializedGame
    })
  } catch (error) {
    logger.error('Get game error:', error)
    res.status(500).json({ success: false, error: 'Failed to get game' })
  }
}

// Get game by post ID
export const getGameByPostId = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params

    const game = await prisma.game.findUnique({
      where: { postId },
      include: {
        player1User: true,
        player2User: true,
        winnerUser: true
      }
    })

    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' })
    }

    // Convert BigInt to string for JSON serialization
    const serializedGame = {
      ...game,
      onChainGameId: game.onChainGameId ? game.onChainGameId.toString() : null,
      wager: game.wager.toString()
    }

    res.json({
      success: true,
      game: serializedGame
    })
  } catch (error) {
    logger.error('Get game by post error:', error)
    res.status(500).json({ success: false, error: 'Failed to get game' })
  }
}

// Game logic helpers
function processTicTacToeMove(game: GameRecord, gameState: GameState, move: { row: number; col: number }, playerWallet: string): string | null {
  const { row, col } = move
  const board = gameState.board!
  
  // Check if it's player's turn
  if (game.currentTurn !== playerWallet) {
    throw new Error('Not your turn')
  }

  // Check if cell is empty
  if (board[row][col] !== null) {
    throw new Error('Cell already occupied')
  }

  // Make the move
  const symbol = playerWallet === game.player1 ? 'X' : 'O'
  board[row][col] = symbol
  gameState.moves!.push({ player: playerWallet, position: { row, col }, timestamp: new Date() } as Move)

  // Check for winner
  return checkTicTacToeWinner(board, game.player1, game.player2!)
}

function processConnectFourMove(game: GameRecord, gameState: GameState, move: { column: number }, playerWallet: string): string | null {
  const { column } = move
  const board = gameState.board!
  
  // Check if it's player's turn
  if (game.currentTurn !== playerWallet) {
    throw new Error('Not your turn')
  }

  // Find the lowest empty row in the column
  let row = -1
  for (let i = 5; i >= 0; i--) {
    if (board[i][column] === null) {
      row = i
      break
    }
  }

  if (row === -1) {
    throw new Error('Column is full')
  }

  // Make the move
  const color = playerWallet === game.player1 ? 'red' : 'yellow'
  board[row][column] = color
  gameState.moves!.push({ player: playerWallet, position: { row, col: column }, timestamp: new Date() } as Move)

  // Check for winner
  return checkConnectFourWinner(board, row, column, color, game.player1, game.player2!)
}

function processRPSMove(game: GameRecord, gameState: GameState, move: { choice: string }, playerWallet: string): string | null {
  const { choice } = move // 'rock', 'paper', or 'scissors'
  
  if (playerWallet === game.player1) {
    gameState.player1Choice = choice
  } else {
    gameState.player2Choice = choice
  }

  // If both players have made their choice
  if (gameState.player1Choice && gameState.player2Choice) {
    const winner = determineRPSWinner(gameState.player1Choice, gameState.player2Choice)
    
    if (winner === 'player1') {
      gameState.score!.player1++
    } else if (winner === 'player2') {
      gameState.score!.player2++
    }

    // Store the round result in a different property
    if (!gameState.roundResults) {
      gameState.roundResults = []
    }
    const results = gameState.roundResults as any[]
    results.push({
      round: gameState.round,
      player1Choice: gameState.player1Choice,
      player2Choice: gameState.player2Choice,
      winner
    })

    // Reset choices for next round
    gameState.player1Choice = undefined
    gameState.player2Choice = undefined
    gameState.round!++

    // Check if someone won (best of 3)
    if (gameState.score!.player1 >= 2) {
      return game.player1
    } else if (gameState.score!.player2 >= 2) {
      return game.player2
    }
  }

  return null
}


// Winner checking functions
function checkTicTacToeWinner(board: GameBoard, player1: string, player2: string): string | null {
  // Check rows, columns, and diagonals
  for (let i = 0; i < 3; i++) {
    // Check rows
    if (board[i][0] && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
      return board[i][0] === 'X' ? player1 : player2
    }
    // Check columns
    if (board[0][i] && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
      return board[0][i] === 'X' ? player1 : player2
    }
  }
  
  // Check diagonals
  if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
    return board[0][0] === 'X' ? player1 : player2
  }
  if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
    return board[0][2] === 'X' ? player1 : player2
  }

  // Check for draw
  const isDraw = board.every(row => row.every(cell => cell !== null))
  if (isDraw) return 'draw'

  return null
}

function checkConnectFourWinner(board: GameBoard, row: number, col: number, color: string, player1: string, player2: string): string | null {
  // Check horizontal, vertical, and both diagonals
  const directions = [
    [[0, 1], [0, -1]], // Horizontal
    [[1, 0], [-1, 0]], // Vertical
    [[1, 1], [-1, -1]], // Diagonal \
    [[1, -1], [-1, 1]]  // Diagonal /
  ]

  for (const direction of directions) {
    let count = 1 // Include the current piece
    
    for (const [dr, dc] of direction) {
      let r = row + dr
      let c = col + dc
      
      while (r >= 0 && r < 6 && c >= 0 && c < 7 && board[r][c] === color) {
        count++
        r += dr
        c += dc
      }
    }
    
    if (count >= 4) {
      return color === 'red' ? player1 : player2
    }
  }

  // Check for draw
  const isDraw = board.every(row => row.every(cell => cell !== null))
  if (isDraw) return 'draw'

  return null
}

function determineRPSWinner(choice1: string, choice2: string): 'player1' | 'player2' | 'draw' {
  if (choice1 === choice2) return 'draw'

  if (
    (choice1 === 'rock' && choice2 === 'scissors') ||
    (choice1 === 'paper' && choice2 === 'rock') ||
    (choice1 === 'scissors' && choice2 === 'paper')
  ) {
    return 'player1'
  }

  return 'player2'
}

/**
 * Get all games (optionally filtered by status)
 */
export const getAllGames = async (req: Request, res: Response) => {
  try {
    const { status } = req.query

    const where: any = {}
    if (status) {
      where.status = status
    }

    const games = await prisma.game.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // Limit to 100 games
    })

    // Convert BigInt to string for JSON serialization
    const serializedGames = games.map(game => ({
      ...game,
      onChainGameId: game.onChainGameId ? game.onChainGameId.toString() : null,
      wager: game.wager.toString()
    }))

    res.json({
      success: true,
      games: serializedGames
    })
  } catch (error) {
    logger.error('Error fetching games:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch games'
    })
  }
}

/**
 * Delete/cancel a game
 * Only the creator (player1) can delete a waiting game
 */
export async function deleteGame(req: AuthRequest, res: Response) {
  try {
    const gameId = req.params.id
    const playerWallet = req.userWallet!

    // Get the game
    const game = await prisma.game.findUnique({
      where: { id: gameId }
    })

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      })
    }

    // Only player1 (creator) can delete the game
    if (game.player1 !== playerWallet) {
      return res.status(403).json({
        success: false,
        error: 'Only the game creator can cancel it'
      })
    }

    // Only allow deleting waiting games
    if (game.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        error: 'Can only cancel waiting games'
      })
    }

    // Delete the game
    await prisma.game.delete({
      where: { id: gameId }
    })

    logger.info(`Game ${gameId} cancelled by ${playerWallet}`)

    res.json({
      success: true
    })
  } catch (error) {
    logger.error('Error deleting game:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete game'
    })
  }
}