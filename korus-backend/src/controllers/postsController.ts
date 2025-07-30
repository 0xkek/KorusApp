import { Request, Response } from 'express'
import prisma from '../config/database'
import { AuthRequest } from '../middleware/auth'
import { CreatePostRequest, ApiResponse, PaginatedResponse, Post } from '../types'
import { autoModerate } from './moderationController'
import { reputationService } from '../services/reputationService'

export const createPost = async (req: AuthRequest, res: Response<ApiResponse<Post>>) => {
  try {
    const walletAddress = req.userWallet!
    const { content } = req.body

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
        content: content.trim()
        // topic and subtopic are now optional
      },
      include: {
        author: {
          select: {
            walletAddress: true,
            tier: true,
            genesisVerified: true
          }
        }
      }
    })

    console.log(`New post created by ${walletAddress}: ${content.substring(0, 50)}...`)

    // Run auto-moderation on the new post
    // TODO: Re-enable after fixing deployment
    // await autoModerate('post', post.id, content)

    // Award reputation points for creating a post
    // TODO: Re-enable after fixing deployment
    // const hasMedia = false; // TODO: Add media detection when implementing image/video uploads
    // await reputationService.onPostCreated(walletAddress, hasMedia)

    res.status(201).json({
      success: true,
      post: post
    } as any)
  } catch (error) {
    console.error('Create post error:', error)
    res.status(500).json({ success: false, error: 'Failed to create post' })
  }
}

export const getPosts = async (req: Request, res: Response<PaginatedResponse<Post>>) => {
  try {
    const { limit = 20, offset = 0 } = req.query

    // Get posts with author info
    const posts = await prisma.post.findMany({
      include: {
        author: {
          select: {
            walletAddress: true,
            tier: true,
            genesisVerified: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    })

    // Add empty replies array for compatibility
    const postsWithReplies = posts.map(post => ({
      ...post,
      replies: []
    }))

    res.json({
      success: true,
      posts: postsWithReplies,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        hasMore: posts.length === Number(limit)
      }
    } as any)
  } catch (error: any) {
    console.error('Get posts error:', error)
    console.error('Error stack:', error?.stack)
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
            genesisVerified: true
          }
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                walletAddress: true,
                tier: true,
                genesisVerified: true
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
    console.error('Get single post error:', error)
    res.status(500).json({ success: false, error: 'Failed to get post' })
  }
}