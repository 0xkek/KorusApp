import { logger } from '../utils/logger'
import { Request, Response } from 'express'
import prisma from '../config/database'
import { AuthRequest } from '../middleware/auth'
import { CreatePostRequest, ApiResponse, PaginatedResponse, Post } from '../types'
import { autoModerate } from './moderationController'
import { reputationService } from '../services/reputationService'
import { CursorPagination } from '../utils/pagination'

export const createPost = async (req: AuthRequest, res: Response<ApiResponse<Post>>) => {
  try {
    const walletAddress = req.userWallet!
    const { content, imageUrl, videoUrl, shoutoutDuration, transactionSignature } = req.body

    // Validate input - require either content or media
    if (!content && !imageUrl && !videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Post must have either content or media (image/video)'
      } as any)
    }

    if (content && content.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Content must be 500 characters or less'
      } as any)
    }

    // Calculate shoutout fields if this is a shoutout post
    let shoutoutData: any = {}
    if (shoutoutDuration) {
      // Pricing logic (matches frontend)
      const shoutoutPrices: { [key: number]: number } = {
        10: 0.05,
        20: 0.10,
        30: 0.18,
        60: 0.35,
        120: 0.70,
        180: 1.30,
        240: 2.00
      }

      const price = shoutoutPrices[shoutoutDuration]
      if (!price) {
        return res.status(400).json({
          success: false,
          error: 'Invalid shoutout duration'
        } as any)
      }

      // Require transaction signature for shoutout posts
      if (!transactionSignature) {
        return res.status(400).json({
          success: false,
          error: 'Payment transaction signature required for shoutout posts'
        } as any)
      }

      // TODO: Verify the SOL transaction here
      // For now, we'll trust the frontend but in production you should:
      // 1. Verify the transaction signature with Solana RPC
      // 2. Check that the amount matches the price
      // 3. Confirm transaction is to the platform wallet
      // 4. Ensure transaction is recent (within last few minutes)
      
      logger.debug(`Shoutout payment received - Duration: ${shoutoutDuration} minutes, Price: ${price} SOL, Tx: ${transactionSignature}`)

      // Set shoutout fields
      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + shoutoutDuration)
      
      shoutoutData = {
        isShoutout: true,
        shoutoutDuration,
        shoutoutExpiresAt: expiresAt,
        shoutoutPrice: price
      }
    }

    // Create post
    const post = await prisma.post.create({
      data: {
        authorWallet: walletAddress,
        content: content ? content.trim() : '',
        imageUrl: imageUrl || undefined,
        videoUrl: videoUrl || undefined,
        ...shoutoutData
        // topic and subtopic are now optional
      },
      include: {
        author: {
          select: {
            walletAddress: true,
            tier: true,
            genesisVerified: true,
            snsUsername: true,
            nftAvatar: true
          }
        }
      }
    })

    logger.debug(`New post created by ${walletAddress}: ${content ? content.substring(0, 50) : '[image/video only]'}...`)

    // Run auto-moderation on the new post
    // TODO: Re-enable after fixing deployment
    // await autoModerate('post', post.id, content)

    // Award reputation points for creating a post
    // Update reputation for post creation
    const hasMedia = !!(imageUrl || videoUrl);
    await reputationService.onPostCreated(walletAddress, hasMedia)

    res.status(201).json({
      success: true,
      post: post
    } as any)
  } catch (error) {
    logger.error('Create post error:', error)
    res.status(500).json({ success: false, error: 'Failed to create post' })
  }
}

export const getPosts = async (req: Request, res: Response) => {
  try {
    const { cursor, limit, maxId, sinceId } = req.query

    // First, get active shoutouts (not expired)
    const now = new Date()
    const activeShoutouts = await prisma.post.findMany({
      where: {
        isHidden: false,
        isShoutout: true,
        shoutoutExpiresAt: {
          gt: now // Greater than current time (not expired)
        }
      },
      include: {
        author: {
          select: {
            walletAddress: true,
            tier: true,
            genesisVerified: true,
            snsUsername: true,
            username: true,
            nftAvatar: true
          }
        }
      },
      orderBy: {
        shoutoutExpiresAt: 'desc' // Most recently expiring first
      }
    })

    // Then get regular posts using cursor pagination (excluding ALL shoutout posts)
    const result = await CursorPagination.paginateQuery<any>(
      prisma.post,
      {
        cursor: cursor as string,
        limit: limit ? parseInt(limit as string) : undefined,
        maxId: maxId as string,
        sinceId: sinceId as string
      },
      {
        where: { 
          isHidden: false,
          isShoutout: false // Only show non-shoutout posts in regular feed
        },
        include: {
          author: {
            select: {
              walletAddress: true,
              tier: true,
              genesisVerified: true,
              snsUsername: true,
              username: true,
              nftAvatar: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    )

    // Combine shoutouts at top with regular posts
    const allPosts = [
      ...activeShoutouts.map((post: any) => ({
        ...post,
        replies: []
      })),
      ...result.data.map((post: any) => ({
        ...post,
        replies: []
      }))
    ]

    res.json({
      success: true,
      posts: allPosts,
      meta: result.meta,
      pagination: {
        limit: result.meta.resultCount,
        cursor: result.meta.nextCursor,
        hasMore: result.meta.hasMore
      }
    })
  } catch (error: any) {
    logger.error('Get posts error:', error)
    logger.error('Error stack:', error?.stack)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get posts',
      details: error?.message || 'Unknown error'
    } as any)
  }
}


export const getSinglePost = async (req: Request, res: Response<ApiResponse<Post>>) => {
  try {
    const { id } = req.params

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            walletAddress: true,
            tier: true,
            genesisVerified: true,
            snsUsername: true,
            username: true,
            nftAvatar: true
          }
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                walletAddress: true,
                tier: true,
                genesisVerified: true,
                snsUsername: true,
                username: true,
                nftAvatar: true
              }
            }
          }
        }
      }
    })

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' })
    }

    // Check if it's an expired shoutout post
    if (post.isShoutout && post.shoutoutExpiresAt) {
      const now = new Date()
      if (post.shoutoutExpiresAt < now) {
        return res.status(404).json({ success: false, error: 'Post has expired' })
      }
    }

    res.json({
      success: true,
      post: post
    } as any)
  } catch (error) {
    logger.error('Get single post error:', error)
    res.status(500).json({ success: false, error: 'Failed to get post' })
  }
}