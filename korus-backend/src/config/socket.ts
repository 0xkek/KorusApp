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
 * Emit a new post event to all connected clients
 */
export const emitNewPost = (post: any) => {
  if (io) {
    io.emit('new_post', post)
    logger.debug(`Emitted new post: ${post.id}`)
  }
}

/**
 * Emit a new reply event to all connected clients
 */
export const emitNewReply = (reply: any) => {
  if (io) {
    io.emit('new_reply', reply)
    logger.debug(`Emitted new reply: ${reply.id}`)
  }
}

/**
 * Emit a post update event (for likes, tips, etc.)
 */
export const emitPostUpdate = (postId: string, updates: any) => {
  if (io) {
    io.emit('post_update', { postId, updates })
    logger.debug(`Emitted post update: ${postId}`)
  }
}
