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
      orderBy: [
        // First, prioritize bumped posts that are still active
        {
          bumpExpiresAt: {
            sort: 'desc',
            nulls: 'last'
          }
        },
        // Then chronological order
        { createdAt: 'desc' }
      ],
      take: Number(limit),
      skip: Number(offset)
    })

    // Process posts to check if bumps are still active
    const processedPosts = posts.map(post => {
      const isBumpActive = post.bumpExpiresAt && now < post.bumpExpiresAt
      
      return {
        ...post,
        isBumpActive,
        bumpTimeRemaining: isBumpActive 
          ? Math.max(0, Math.floor((post.bumpExpiresAt!.getTime() - now.getTime()) / 1000))
          : 0
      }
    })

    // Sort again to ensure bumped posts are truly at the top
    processedPosts.sort((a, b) => {
      if (a.isBumpActive && !b.isBumpActive) return -1
      if (!a.isBumpActive && b.isBumpActive) return 1
      if (a.isBumpActive && b.isBumpActive) {
        return b.bumpedAt!.getTime() - a.bumpedAt!.getTime()
      }
      return b.createdAt.getTime() - a.createdAt.getTime()
    })

    res.json({
      success: true,
      posts: processedPosts,
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

export const bumpPost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const walletAddress = req.userWallet!
    const now = new Date()
    const bumpExpiresAt = new Date(now.getTime() + 5 * 60 * 1000) // 5 minutes

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id }
    })

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // Check if post is already bumped and still active
    if (post.bumpExpiresAt && now < post.bumpExpiresAt) {
      const timeRemaining = Math.floor((post.bumpExpiresAt.getTime() - now.getTime()) / 1000)
      return res.status(400).json({
        error: 'Post is already bumped',
        timeRemaining
      })
    }

    // Update post with new bump
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        bumped: true,
        bumpedAt: now,
        bumpExpiresAt,
        bumpCount: { increment: 1 }
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

    // Record the bump interaction
    await prisma.interaction.upsert({
      where: {
        userWallet_targetId_interactionType: {
          userWallet: walletAddress,
          targetId: id,
          interactionType: 'bump'
        }
      },
      update: {
        createdAt: now
      },
      create: {
        userWallet: walletAddress,
        targetType: 'post',
        targetId: id,
        interactionType: 'bump'
      }
    })

    console.log(`Post ${id} bumped by ${walletAddress} for 5 minutes`)

    res.json({
      success: true,
      post: updatedPost,
      bumpExpiresAt,
      message: 'Post bumped to top for 5 minutes'
    })
  } catch (error) {
    console.error('Bump post error:', error)
    res.status(500).json({ error: 'Failed to bump post' })
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

    // Check if bump is still active
    const now = new Date()
    const isBumpActive = post.bumpExpiresAt && now < post.bumpExpiresAt
    const bumpTimeRemaining = isBumpActive 
      ? Math.max(0, Math.floor((post.bumpExpiresAt!.getTime() - now.getTime()) / 1000))
      : 0

    res.json({
      success: true,
      post: {
        ...post,
        isBumpActive,
        bumpTimeRemaining
      }
    })
  } catch (error) {
    console.error('Get single post error:', error)
    res.status(500).json({ error: 'Failed to get post' })
  }
}