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
    const { content, imageUrl, videoUrl } = req.body

    // Validate input
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: content'
      } as any)
    }

    if (content.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Content must be 500 characters or less'
      } as any)
    }

    // Create post
    const post = await prisma.post.create({
      data: {
        authorWallet: walletAddress,
        content: content.trim(),
        imageUrl: imageUrl || undefined,
        videoUrl: videoUrl || undefined
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

    logger.debug(`New post created by ${walletAddress}: ${content.substring(0, 50)}...`)

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

    // Use cursor pagination
    const result = await CursorPagination.paginateQuery<any>(
      prisma.post,
      {
        cursor: cursor as string,
        limit: limit ? parseInt(limit as string) : undefined,
        maxId: maxId as string,
        sinceId: sinceId as string
      },
      {
        where: { isHidden: false },
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

    // Add empty replies array for compatibility
    const postsWithReplies = result.data.map((post: any) => ({
      ...post,
      replies: []
    }))

    res.json({
      success: true,
      posts: postsWithReplies,
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

    res.json({
      success: true,
      post: post
    } as any)
  } catch (error) {
    logger.error('Get single post error:', error)
    res.status(500).json({ success: false, error: 'Failed to get post' })
  }
}