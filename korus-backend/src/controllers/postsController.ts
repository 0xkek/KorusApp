import { Request, Response } from 'express'
import prisma from '../config/database'
import { AuthRequest } from '../middleware/auth'

export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const walletAddress = req.userWallet!
    const { content, topic, subtopic } = req.body

    // Validate input
    if (!content || !topic || !subtopic) {
      return res.status(400).json({
        error: 'Missing required fields: content, topic, subtopic'
      })
    }

    if (content.length > 500) {
      return res.status(400).json({
        error: 'Content must be 500 characters or less'
      })
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

    res.status(201).json({
      success: true,
      post: {
        ...post,
        author: post.author
      }
    })
  } catch (error) {
    console.error('Create post error:', error)
    res.status(500).json({ error: 'Failed to create post' })
  }
}

export const getPosts = async (req: Request, res: Response) => {
  try {
    const { topic, subtopic, limit = 20, offset = 0 } = req.query
    const now = new Date()

    // Build filter conditions
    const where: any = {}
    if (topic) where.topic = topic.toString().toLowerCase()
    if (subtopic) where.subtopic = subtopic.toString().toLowerCase()

    // Get posts with chronological + bump ordering
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
    })
  } catch (error) {
    console.error('Get posts error:', error)
    res.status(500).json({ error: 'Failed to get posts' })
  }
}


export const getSinglePost = async (req: Request, res: Response) => {
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
      return res.status(404).json({ error: 'Post not found' })
    }

    res.json({
      success: true,
      post: post
    })
  } catch (error) {
    console.error('Get single post error:', error)
    res.status(500).json({ error: 'Failed to get post' })
  }
}