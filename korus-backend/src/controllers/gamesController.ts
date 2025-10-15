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
type GameBoard = BoardCell[] | BoardCell[][] // 1D for tic-tac-toe, 2D for connect four

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
          board: Array(9).fill(null), // Flat 1D array for 3x3 grid
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
          moves: [],
          playerMoves: {} // Track current round moves by wallet address
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

    // Migrate old tic-tac-toe 2D arrays to 1D arrays for backward compatibility
    if (game.gameType === 'tictactoe' && gameState.board) {
      const board = gameState.board as any;
      if (Array.isArray(board[0])) {
        // Old 2D format - flatten it
        logger.info(`Migrating old 2D board to 1D format for game ${game.id}`);
        gameState.board = board.flat();
      }
    }

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

      // Note: Blockchain completion happens after database update (see lines 376-422)
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

    // If game is completed and has an on-chain game ID, complete it on-chain
    logger.info(`🔍 COMPLETION CHECK: newStatus=${newStatus}, onChainGameId=${updatedGame.onChainGameId}, type=${typeof updatedGame.onChainGameId}`);
    if (newStatus === 'completed' && updatedGame.onChainGameId) {
      try {
        logger.info(`Game completed, triggering on-chain payout for game ID: ${updatedGame.onChainGameId}`);

        // Call smart contract to distribute funds
        const result = await gameEscrowService.completeGame(
          Number(updatedGame.onChainGameId),
          winner // winner wallet address or null for draw
        );

        if (result.success && result.signature) {
          logger.info(`✅ On-chain payout successful! Signature: ${result.signature}`);

          // Update or create GameEscrow with payout transaction signature
          const wagerNum = Number(updatedGame.wager);
          const totalPot = wagerNum * 2;
          const platformFee = totalPot * 0.02; // 2%
          const winnerPayout = totalPot * 0.98; // 98%

          await prisma.gameEscrow.upsert({
            where: { gameId: updatedGame.id },
            update: {
              payoutTxSig: result.signature,
              status: 'paid'
            },
            create: {
              gameId: updatedGame.id,
              player1Wallet: updatedGame.player1,
              player2Wallet: updatedGame.player2!,
              player1Amount: wagerNum,
              player2Amount: wagerNum,
              totalPot,
              platformFee,
              winnerPayout,
              payoutTxSig: result.signature,
              status: 'paid'
            }
          });
        } else {
          logger.error(`❌ On-chain payout failed: ${result.error}`);

          // Create escrow record showing failure for debugging
          const wagerNum = Number(updatedGame.wager);
          const totalPot = wagerNum * 2;
          const platformFee = totalPot * 0.02;
          const winnerPayout = totalPot * 0.98;

          await prisma.gameEscrow.upsert({
            where: { gameId: updatedGame.id },
            update: { status: 'failed' },
            create: {
              gameId: updatedGame.id,
              player1Wallet: updatedGame.player1,
              player2Wallet: updatedGame.player2!,
              player1Amount: wagerNum,
              player2Amount: wagerNum,
              totalPot,
              platformFee,
              winnerPayout,
              status: 'failed'
            }
          });
        }
      } catch (error) {
        logger.error('Error processing on-chain payout:', error);

        // Create escrow record showing error
        try {
          const wagerNum = Number(updatedGame.wager);
          const totalPot = wagerNum * 2;
          const platformFee = totalPot * 0.02;
          const winnerPayout = totalPot * 0.98;

          await prisma.gameEscrow.upsert({
            where: { gameId: updatedGame.id },
            update: { status: 'error' },
            create: {
              gameId: updatedGame.id,
              player1Wallet: updatedGame.player1,
              player2Wallet: updatedGame.player2!,
              player1Amount: wagerNum,
              player2Amount: wagerNum,
              totalPot,
              platformFee,
              winnerPayout,
              status: 'error'
            }
          });
        } catch (e) {
          logger.error('Failed to create error escrow record:', e);
        }
      }
    }

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
        escrow: true,
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
function processTicTacToeMove(game: GameRecord, gameState: GameState, move: { index: number }, playerWallet: string): string | null {
  const { index } = move
  const board = gameState.board! as BoardCell[]

  // Check if it's player's turn
  if (game.currentTurn !== playerWallet) {
    throw new Error('Not your turn')
  }

  // Validate index
  if (index < 0 || index > 8) {
    throw new Error('Invalid cell index')
  }

  // Check if cell is empty
  if (board[index] !== null) {
    throw new Error('Cell already occupied')
  }

  // Make the move
  const symbol = playerWallet === game.player1 ? 'X' : 'O'
  board[index] = symbol

  // Calculate row/col for move history
  const row = Math.floor(index / 3)
  const col = index % 3
  gameState.moves!.push({ player: playerWallet, position: { row, col }, timestamp: new Date() } as Move)

  // Check for winner
  return checkTicTacToeWinner(board, game.player1, game.player2!)
}

function processConnectFourMove(game: GameRecord, gameState: GameState, move: { column: number }, playerWallet: string): string | null {
  const { column } = move
  const board = gameState.board! as BoardCell[][]
  
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

  // Initialize playerMoves if it doesn't exist
  if (!gameState.playerMoves) {
    gameState.playerMoves = {}
  }

  // Store the player's move for this round
  const playerMoves = gameState.playerMoves as Record<string, string>
  playerMoves[playerWallet] = choice

  // Check if both players have made their choice
  const player1Choice = playerMoves[game.player1]
  const player2Choice = game.player2 ? playerMoves[game.player2] : undefined

  if (player1Choice && player2Choice) {
    const winner = determineRPSWinner(player1Choice, player2Choice)

    // Store the round result
    if (!gameState.roundResults) {
      gameState.roundResults = []
    }
    const results = gameState.roundResults as any[]
    results.push({
      round: gameState.round,
      player1Choice: player1Choice,
      player2Choice: player2Choice,
      winner
    })

    // If it's a draw, reset for next round
    if (winner === 'draw') {
      gameState.playerMoves = {}
      gameState.round!++
      return null
    }

    // Someone won! End the game
    if (winner === 'player1') {
      return game.player1
    } else if (winner === 'player2') {
      return game.player2!
    }
  }

  return null
}


// Winner checking functions
function checkTicTacToeWinner(board: BoardCell[], player1: string, player2: string): string | null {
  // Winning combinations for flat 1D array (indices 0-8)
  const winPatterns = [
    [0, 1, 2], // Top row
    [3, 4, 5], // Middle row
    [6, 7, 8], // Bottom row
    [0, 3, 6], // Left column
    [1, 4, 7], // Middle column
    [2, 5, 8], // Right column
    [0, 4, 8], // Diagonal \
    [2, 4, 6]  // Diagonal /
  ]

  // Check each winning pattern
  for (const pattern of winPatterns) {
    const [a, b, c] = pattern
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return board[a] === 'X' ? player1 : player2
    }
  }

  // Check for draw (all cells filled)
  const isDraw = board.every(cell => cell !== null)
  if (isDraw) return 'draw'

  return null
}

function checkConnectFourWinner(board: GameBoard, row: number, col: number, color: string, player1: string, player2: string): string | null {
  const board2D = board as BoardCell[][]
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

      while (r >= 0 && r < 6 && c >= 0 && c < 7 && board2D[r][c] === color) {
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
  const isDraw = board2D.every((row: BoardCell[]) => row.every((cell: BoardCell) => cell !== null))
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
      include: {
        player1User: true,
        player2User: true,
        winnerUser: true,
        escrow: true
      },
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
export const deleteGame = async (req: AuthRequest, res: Response) => {
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