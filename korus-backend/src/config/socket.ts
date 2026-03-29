import { Server as SocketServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { logger } from '../utils/logger'

let io: SocketServer | null = null

/**
 * Initialize WebSocket server
 */
export const initializeSocket = (httpServer: HTTPServer) => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow all origins in development, or specified origins in production
        const allowedOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [
          'http://localhost:8081',
          'http://localhost:3000',
          'http://localhost:19006'
        ]

        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true)
        } else {
          callback(new Error('Not allowed by CORS'))
        }
      },
      credentials: true,
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', (socket) => {
    logger.debug(`WebSocket client connected: ${socket.id}`)

    // Allow clients to join their user-specific room for targeted notifications
    socket.on('join_user', (walletAddress: string) => {
      if (walletAddress && typeof walletAddress === 'string') {
        socket.join(`user:${walletAddress}`)
        logger.debug(`Socket ${socket.id} joined room user:${walletAddress}`)
      }
    })

    // Allow clients to join/leave feed room for targeted feed events
    socket.on('join_feed', () => {
      socket.join('feed')
      logger.debug(`Socket ${socket.id} joined feed room`)
    })

    socket.on('leave_feed', () => {
      socket.leave('feed')
      logger.debug(`Socket ${socket.id} left feed room`)
    })

    socket.on('disconnect', () => {
      logger.debug(`WebSocket client disconnected: ${socket.id}`)
    })
  })

  logger.info('✅ WebSocket server initialized')
  return io
}

/**
 * Get the Socket.IO instance
 */
export const getIO = (): SocketServer => {
  if (!io) {
    throw new Error('Socket.io not initialized!')
  }
  return io
}

/**
 * Emit a new post event to clients in the feed room
 */
export const emitNewPost = (post: any) => {
  if (io) {
    io.to('feed').emit('new_post', post)
    logger.debug(`Emitted new post to feed room: ${post.id}`)
  }
}

/**
 * Emit a new reply event to clients in the feed room
 */
export const emitNewReply = (reply: any) => {
  if (io) {
    io.to('feed').emit('new_reply', reply)
    logger.debug(`Emitted new reply to feed room: ${reply.id}`)
  }
}

/**
 * Emit a post update event (for likes, tips, etc.) to clients in the feed room
 */
export const emitPostUpdate = (postId: string, updates: any) => {
  if (io) {
    io.to('feed').emit('post_update', { postId, updates })
    logger.debug(`Emitted post update to feed room: ${postId}`)
  }
}

/**
 * Emit a notification to a specific user's room
 */
export const emitNotification = (userId: string, notification: any) => {
  if (io) {
    io.to(`user:${userId}`).emit('new_notification', notification)
    logger.debug(`Emitted notification to user:${userId}`)
  }
}

/**
 * Emit a game_created event to all connected clients
 */
export const emitGameCreated = (game: any) => {
  if (io) {
    io.emit('game_created', game)
    logger.debug(`Emitted game_created: ${game.id}`)
  }
}

/**
 * Emit a game_joined event to all connected clients
 */
export const emitGameJoined = (game: any) => {
  if (io) {
    io.emit('game_joined', game)
    logger.debug(`Emitted game_joined: ${game.id}`)
  }
}

/**
 * Emit a game_move event to both players in a game
 */
export const emitGameMove = (player1: string, player2: string, game: any) => {
  if (io) {
    io.to(`user:${player1}`).to(`user:${player2}`).emit('game_move', game)
    logger.debug(`Emitted game_move: ${game.id}`)
  }
}

/**
 * Emit a game_completed event to both players in a game
 */
export const emitGameCompleted = (player1: string, player2: string, game: any) => {
  if (io) {
    io.to(`user:${player1}`).to(`user:${player2}`).emit('game_completed', game)
    // Also broadcast to all so the lobby updates
    io.emit('game_completed', game)
    logger.debug(`Emitted game_completed: ${game.id}`)
  }
}
