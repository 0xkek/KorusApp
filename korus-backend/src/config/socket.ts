import { Server as SocketServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import jwt from 'jsonwebtoken'
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

    // Simple per-socket rate limiting: max 20 events per 10 seconds
    const eventTimestamps: number[] = []
    const WS_RATE_LIMIT = 20
    const WS_RATE_WINDOW_MS = 10000

    const isRateLimited = (): boolean => {
      const now = Date.now()
      // Remove expired timestamps
      while (eventTimestamps.length > 0 && eventTimestamps[0] < now - WS_RATE_WINDOW_MS) {
        eventTimestamps.shift()
      }
      if (eventTimestamps.length >= WS_RATE_LIMIT) {
        return true
      }
      eventTimestamps.push(now)
      return false
    }

    // Allow clients to join their user-specific room for targeted notifications (requires auth)
    socket.on('join_user', (data: string | { walletAddress: string; token: string }) => {
      if (isRateLimited()) return
      // Legacy string format: require token in new object format
      if (typeof data === 'string') {
        logger.debug(`Socket ${socket.id} rejected join_user: legacy string format no longer supported`)
        return
      }

      if (!data?.walletAddress || !data?.token) return

      try {
        const decoded = jwt.verify(data.token, process.env.JWT_SECRET!) as { walletAddress: string }
        if (decoded.walletAddress === data.walletAddress) {
          socket.join(`user:${data.walletAddress}`)
          logger.debug(`Socket ${socket.id} joined room user:${data.walletAddress} (authenticated)`)
        }
      } catch {
        logger.debug(`Socket ${socket.id} failed auth for user:${data.walletAddress}`)
      }
    })

    // Allow clients to join/leave feed room for targeted feed events
    socket.on('join_feed', () => {
      if (isRateLimited()) return
      socket.join('feed')
      logger.debug(`Socket ${socket.id} joined feed room`)
    })

    socket.on('leave_feed', () => {
      if (isRateLimited()) return
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
