import { Request, Response } from 'express'
import prisma from '../config/database'
import { AuthRequest } from '../middleware/auth'
import { CreatePostRequest, ApiResponse, PaginatedResponse, Post } from '../types'
import { autoModerate } from './moderationController'

export const createPost = async (req: AuthRequest, res: Response<ApiResponse<Post>>) => {
  try {
    const walletAddress = req.userWallet!
    const { content, topic, subtopic } = req.body

    // Validate input
    if (!content || !topic || !subtopic) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: content, topic, subtopic'
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
        topic: topic.toLowerCase(),
        subtopic: subtopic.toLowerCase()
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
    await autoModerate('post', post.id, content)

    res.status(201).json({
      success: true,
      post: {
        ...post,
        author: post.author
      }
    } as any)
  } catch (error) {
    console.error('Create post error:', error)
    res.status(500).json({ success: false, error: 'Failed to create post' })
  }
}

export const getPosts = async (req: Request, res: Response<PaginatedResponse<Post>>) => {
  try {
    const { topic, subtopic, limit = 20, offset = 0 } = req.query
    const now = new Date()

    // Build filter conditions
    const where: any = { isHidden: false } // Filter out hidden posts
    if (topic) where.topic = topic.toString().toLowerCase()
    if (subtopic) where.subtopic = subtopic.toString().toLowerCase()

    // Get posts with chronological ordering
    const posts = await prisma.post.findMany({
      where,
      include: {
        author: {
          select: {
            walletAddress: true,
            tier: true,
            genesisVerified: true
          }
        },
        replies: {
          take: 3, // Just show first 3 replies
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
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    })

    res.json({
      success: true,
      posts: posts,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        hasMore: posts.length === Number(limit)
      }
    } as any)
  } catch (error) {
    console.error('Get posts error:', error)
    res.status(500).json({ success: false, error: 'Failed to get posts' } as any)
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