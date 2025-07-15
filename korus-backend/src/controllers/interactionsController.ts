import { Request, Response } from 'express'
import prisma from '../config/database'
import { AuthRequest } from '../middleware/auth'

export const likePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const walletAddress = req.userWallet!

    // Check if post exists
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // Toggle like (if already liked, unlike it)
    const existingLike = await prisma.interaction.findUnique({
      where: {
        userWallet_targetId_interactionType: {
          userWallet: walletAddress,
          targetId: id,
          interactionType: 'like'
        }
      }
    })

    if (existingLike) {
      // Unlike
      await prisma.interaction.delete({
        where: { id: existingLike.id }
      })
      await prisma.post.update({
        where: { id },
        data: { likeCount: { decrement: 1 } }
      })
      res.json({ success: true, liked: false, message: 'Post unliked' })
    } else {
      // Like
      await prisma.interaction.create({
        data: {
          userWallet: walletAddress,
          targetType: 'post',
          targetId: id,
          interactionType: 'like'
        }
      })
      await prisma.post.update({
        where: { id },
        data: { likeCount: { increment: 1 } }
      })
      res.json({ success: true, liked: true, message: 'Post liked' })
    }
  } catch (error) {
    console.error('Like post error:', error)
    res.status(500).json({ error: 'Failed to like post' })
  }
}

export const tipPost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { amount = 1 } = req.body // Default 1 $ALLY tip
    const walletAddress = req.userWallet!

    // Check if post exists
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // Can't tip your own post
    if (post.authorWallet === walletAddress) {
      return res.status(400).json({ error: 'Cannot tip your own post' })
    }

    // Create tip interaction
    await prisma.interaction.create({
      data: {
        userWallet: walletAddress,
        targetType: 'post',
        targetId: id,
        interactionType: 'tip',
        amount: amount
      }
    })

    // Update post tip count
    await prisma.post.update({
      where: { id },
      data: { tipCount: { increment: 1 } }
    })

    // Update author's ALLY balance (mock for now)
    await prisma.user.update({
      where: { walletAddress: post.authorWallet },
      data: { allyBalance: { increment: amount } }
    })

    console.log(`${walletAddress} tipped ${amount} $ALLY to post ${id}`)

    res.json({
      success: true,
      message: `Tipped ${amount} $ALLY`,
      amount
    })
  } catch (error) {
    console.error('Tip post error:', error)
    res.status(500).json({ error: 'Failed to tip post' })
  }
}

export const getPostInteractions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const interactions = await prisma.interaction.findMany({
      where: { targetId: id },
      include: {
        user: {
          select: {
            walletAddress: true,
            tier: true,
            genesisVerified: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Group by type
    const grouped = {
      likes: interactions.filter(i => i.interactionType === 'like'),
      tips: interactions.filter(i => i.interactionType === 'tip'),
      bumps: interactions.filter(i => i.interactionType === 'bump')
    }

    res.json({
      success: true,
      interactions: grouped,
      summary: {
        totalLikes: grouped.likes.length,
        totalTips: grouped.tips.length,
        totalBumps: grouped.bumps.length,
        totalTipAmount: grouped.tips.reduce((sum, tip) => sum + Number(tip.amount || 0), 0)
      }
    })
  } catch (error) {
    console.error('Get interactions error:', error)
    res.status(500).json({ error: 'Failed to get interactions' })
  }
}