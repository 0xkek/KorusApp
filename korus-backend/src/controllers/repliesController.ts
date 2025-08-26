import { Request, Response } from 'express'
import prisma from '../config/database'
import { AuthRequest } from '../middleware/auth'
import { autoModerate } from './moderationController'
import { reputationService } from '../services/reputationService'
import { createNotification } from '../utils/notifications'
import { CursorPagination } from '../utils/pagination'

export const createReply = async (req: AuthRequest, res: Response) => {
  try {
    const { id: postId } = req.params
    const walletAddress = req.userWallet!
    const { content, parentReplyId } = req.body

    // Validate input
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Reply content is required' })
    }

    if (content.length > 300) {
      return res.status(400).json({ error: 'Reply must be 300 characters or less' })
    }

    // Check if post exists
    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // If replying to a reply, check parent exists
    if (parentReplyId) {
      const parentReply = await prisma.reply.findUnique({ where: { id: parentReplyId } })
      if (!parentReply || parentReply.postId !== postId) {
        return res.status(404).json({ error: 'Parent reply not found' })
      }
    }

    // Create reply
    const reply = await prisma.reply.create({
      data: {
        postId,
        authorWallet: walletAddress,
        content: content.trim(),
        parentReplyId: parentReplyId || null
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

    // Update post reply count
    await prisma.post.update({
      where: { id: postId },
      data: { replyCount: { increment: 1 } }
    })

    // Run auto-moderation on the new reply
    await autoModerate('reply', reply.id, content)

    // Record interaction for $ALLY calculation (fixed with upsert)
    // Each reply to a post gives the post author 3 points
    await prisma.interaction.upsert({
      where: {
        userWallet_targetId_interactionType: {
          userWallet: post.authorWallet,
          targetId: postId,
          interactionType: 'reply'
        }
      },
      update: {
        createdAt: new Date() // Update timestamp for latest reply
      },
      create: {
        userWallet: post.authorWallet,
        targetType: 'post',
        targetId: postId,
        interactionType: 'reply'
      }
    })

    console.log(`Reply created by ${walletAddress} on post ${postId}`)

    // Award reputation points
    await reputationService.onCommentMade(walletAddress)
    await reputationService.onCommentReceived(post.authorWallet)
    
    // Create notification for post author
    await createNotification({
      userId: post.authorWallet,
      type: 'reply',
      fromUserId: walletAddress,
      postId: postId
    })
    
    // If replying to another reply, notify that user too
    if (parentReplyId) {
      const parentReply = await prisma.reply.findUnique({ 
        where: { id: parentReplyId },
        select: { authorWallet: true }
      })
      if (parentReply && parentReply.authorWallet !== walletAddress) {
        await createNotification({
          userId: parentReply.authorWallet,
          type: 'reply',
          fromUserId: walletAddress,
          postId: postId
        })
      }
    }

    res.status(201).json({
      success: true,
      reply
    })
  } catch (error) {
    console.error('Create reply error:', error)
    res.status(500).json({ error: 'Failed to create reply' })
  }
}

export const getReplies = async (req: Request, res: Response) => {
  try {
    const { id: postId } = req.params
    const { cursor, limit, maxId, sinceId } = req.query

    // Check if post exists
    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // Use cursor pagination for Twitter-style loading
    const result = await CursorPagination.paginateQuery<any>(
      prisma.reply,
      {
        cursor: cursor as string,
        limit: limit ? parseInt(limit as string) : 30, // Default 30 replies
        maxId: maxId as string,
        sinceId: sinceId as string
      },
      {
        where: { 
          postId,
          isHidden: false,
          parentReplyId: null // Only top-level replies
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
          },
          childReplies: {
            where: { isHidden: false },
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
            },
            orderBy: { createdAt: 'asc' },
            take: 3 // Show first 3 nested replies
          },
          _count: {
            select: {
              childReplies: {
                where: { isHidden: false }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' } // Newest first like Twitter
      }
    )

    res.json({
      success: true,
      replies: result.data,
      meta: result.meta,
      pagination: {
        limit: result.meta.resultCount,
        cursor: result.meta.nextCursor,
        hasMore: result.meta.hasMore
      }
    })
  } catch (error) {
    console.error('Get replies error:', error)
    res.status(500).json({ error: 'Failed to get replies' })
  }
}

export const likeReply = async (req: AuthRequest, res: Response) => {
  try {
    const { id: replyId } = req.params
    const walletAddress = req.userWallet!

    // Check if reply exists
    const reply = await prisma.reply.findUnique({ where: { id: replyId } })
    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' })
    }

    // Toggle like
    const existingLike = await prisma.interaction.findUnique({
      where: {
        userWallet_targetId_interactionType: {
          userWallet: walletAddress,
          targetId: replyId,
          interactionType: 'like'
        }
      }
    })

    if (existingLike) {
      // Unlike
      await prisma.interaction.delete({ where: { id: existingLike.id } })
      await prisma.reply.update({
        where: { id: replyId },
        data: { likeCount: { decrement: 1 } }
      })
      res.json({ success: true, liked: false, message: 'Reply unliked' })
    } else {
      // Like
      await prisma.interaction.create({
        data: {
          userWallet: walletAddress,
          targetType: 'reply',
          targetId: replyId,
          interactionType: 'like'
        }
      })
      await prisma.reply.update({
        where: { id: replyId },
        data: { likeCount: { increment: 1 } }
      })
      res.json({ success: true, liked: true, message: 'Reply liked' })
    }
  } catch (error) {
    console.error('Like reply error:', error)
    res.status(500).json({ error: 'Failed to like reply' })
  }
}