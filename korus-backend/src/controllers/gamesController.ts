import { Request, Response } from 'express'
import prisma from '../config/database'

// AuthRequest type
interface AuthRequest extends Request {
  user?: { walletAddress: string }
}

// ApiResponse type
interface ApiResponse {
  success: boolean
  error?: string
  game?: any
  message?: string
}

// Game type definitions
type GameType = 'tictactoe' | 'rps' | 'coinflip' | 'connectfour'

interface GameState {
  board?: any[][] // For tictactoe and connectfour
  moves?: any[] // For tracking move history
  player1Choice?: string // For RPS and coinflip
  player2Choice?: string
  round?: number // For RPS (best of 3)
  score?: { player1: number; player2: number }
  [key: string]: any // Allow additional properties for JSON compatibility
}

// Create a new game
export const createGame = async (req: AuthRequest, res: Response) => {
  try {
    const { postId, gameType, wager } = req.body
    const player1 = req.user!.walletAddress

    // Validate game type
    if (!['tictactoe', 'rps', 'coinflip', 'connectfour'].includes(gameType)) {
      return res.status(400).json({ success: false, error: 'Invalid game type' })
    }

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
      case 'coinflip':
        initialState = {
          player1Choice: undefined,
          player2Choice: undefined
        }
        break
    }

    // Create the game
    const game = await prisma.game.create({
      data: {
        postId,
        gameType,
        player1,
        wager: wager || 0,
        status: 'waiting',
        gameState: initialState,
        currentTurn: gameType === 'coinflip' || gameType === 'rps' ? undefined : player1
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

    res.json({
      success: true,
      game
    })
  } catch (error) {
    console.error('Create game error:', error)
    res.status(500).json({ success: false, error: 'Failed to create game' })
  }
}

// Join an existing game
export const joinGame = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const player2 = req.user!.walletAddress

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
        currentTurn: game.gameType === 'coinflip' || game.gameType === 'rps' ? undefined : game.player1
      },
      include: {
        player1User: true,
        player2User: true
      }
    })

    res.json({
      success: true,
      game: updatedGame
    })
  } catch (error) {
    console.error('Join game error:', error)
    res.status(500).json({ success: false, error: 'Failed to join game' })
  }
}

// Make a move in the game
export const makeMove = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { move } = req.body
    const playerWallet = req.user!.walletAddress

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
      case 'coinflip':
        winner = processCoinFlipMove(game, gameState, move, playerWallet)
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
        
        console.log(`Game rewards awarded - Winner: ${winner}, Game: ${id}`)
      } catch (error) {
        console.error('Failed to award game rewards:', error)
        // Don't fail the game update if rewards fail
      }
    }

    // Update game state
    const updatedGame = await prisma.game.update({
      where: { id },
      data: {
        gameState,
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

    res.json({
      success: true,
      game: updatedGame
    })
  } catch (error) {
    console.error('Make move error:', error)
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

    res.json({
      success: true,
      game
    })
  } catch (error) {
    console.error('Get game error:', error)
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

    res.json({
      success: true,
      game
    })
  } catch (error) {
    console.error('Get game by post error:', error)
    res.status(500).json({ success: false, error: 'Failed to get game' })
  }
}

// Game logic helpers
function processTicTacToeMove(game: any, gameState: GameState, move: any, playerWallet: string): string | null {
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
  gameState.moves!.push({ player: playerWallet, row, col, symbol })

  // Check for winner
  return checkTicTacToeWinner(board, game.player1, game.player2!)
}

function processConnectFourMove(game: any, gameState: GameState, move: any, playerWallet: string): string | null {
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
  gameState.moves!.push({ player: playerWallet, row, column, color })

  // Check for winner
  return checkConnectFourWinner(board, row, column, color, game.player1, game.player2!)
}

function processRPSMove(game: any, gameState: GameState, move: any, playerWallet: string): string | null {
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

    gameState.moves!.push({
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

function processCoinFlipMove(game: any, gameState: GameState, move: any, playerWallet: string): string | null {
  const { choice } = move // 'heads' or 'tails'
  
  // First player chooses
  if (!gameState.player1Choice && playerWallet === game.player1) {
    gameState.player1Choice = choice
    return null
  }

  // Second player triggers the flip
  if (gameState.player1Choice && playerWallet === game.player2) {
    const flip = Math.random() < 0.5 ? 'heads' : 'tails'
    gameState.player2Choice = flip
    
    // Winner is whoever's choice matches the flip
    if (gameState.player1Choice === flip) {
      return game.player1
    } else {
      return game.player2
    }
  }

  throw new Error('Invalid move')
}

// Winner checking functions
function checkTicTacToeWinner(board: any[][], player1: string, player2: string): string | null {
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

function checkConnectFourWinner(board: any[][], row: number, col: number, color: string, player1: string, player2: string): string | null {
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