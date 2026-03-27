import { logger } from '../utils/logger'
import { Request, Response } from 'express'
import prisma from '../config/database'
import { AuthRequest } from '../middleware/auth'
import { reputationService } from '../services/reputationService'
import { createNotification } from '../utils/notifications'
import SolPaymentService from '../services/solPaymentService'
import { emitPostUpdate } from '../config/socket'

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
      const updatedPost = await prisma.post.update({
        where: { id },
        data: { likeCount: { decrement: 1 } }
      })

      // Emit real-time update
      emitPostUpdate(id, {
        likeCount: updatedPost.likeCount,
        action: 'unlike',
        userWallet: walletAddress
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
      const updatedPost = await prisma.post.update({
        where: { id },
        data: { likeCount: { increment: 1 } }
      })

      // Emit real-time update
      emitPostUpdate(id, {
        likeCount: updatedPost.likeCount,
        action: 'like',
        userWallet: walletAddress
      })

      // Award reputation points
      await reputationService.onLikeGiven(walletAddress, 'post')
      await reputationService.onLikeReceived(post.authorWallet, 'post')

      // Create notification
      await createNotification({
        userId: post.authorWallet,
        type: 'like',
        fromUserId: walletAddress,
        postId: id
      })

      res.json({ success: true, liked: true, message: 'Post liked' })
    }
  } catch (error: any) {
    logger.error('Like post error:', error)
    logger.error('Error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta
    })
    
    // Check for specific Prisma errors
    if (error?.code === 'P2003') {
      res.status(400).json({ error: 'User not found. Please reconnect your wallet.' })
    } else {
      res.status(500).json({ error: 'Failed to like post' })
    }
  }
}

export const tipPost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { amount, transactionSignature } = req.body
    const walletAddress = req.userWallet!

    // Validate inputs
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid tip amount' })
    }

    if (!transactionSignature) {
      return res.status(400).json({ error: 'Transaction signature required for SOL tips' })
    }

    // Check if post exists
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // Can't tip your own post
    if (post.authorWallet === walletAddress) {
      return res.status(400).json({ error: 'Cannot tip your own post' })
    }

    // Try to verify SOL transaction on-chain (best-effort)
    // Public RPCs may not have transaction history, so we proceed on "not found" errors
    logger.debug(`Verifying tip transaction - From: ${walletAddress}, To: ${post.authorWallet}, Amount: ${amount} SOL, Tx: ${transactionSignature}`)

    let verifiedAmount = amount;
    try {
      const verification = await SolPaymentService.verifyTransaction(
        walletAddress, // From wallet (tipper)
        post.authorWallet, // To wallet (post author)
        transactionSignature, // Transaction signature to verify
        amount, // Expected amount in SOL
        10 // Max age in minutes
      )

      if (verification.valid) {
        verifiedAmount = verification.actualAmount || amount;
        logger.info(`Tip transaction verified on-chain - From: ${walletAddress}, To: ${post.authorWallet}, Amount: ${verifiedAmount} SOL, Tx: ${transactionSignature}`)
      } else if (verification.error?.includes('not found')) {
        // RPC doesn't have tx history — trust the frontend-signed transaction
        logger.warn(`Tip tx not found on RPC (likely RPC limitation), recording tip with frontend amount - Tx: ${transactionSignature}`)
      } else {
        // Genuinely invalid transaction (failed, wrong wallets, wrong amount)
        logger.warn(`Tip transaction verification failed for ${walletAddress}: ${verification.error}`)
        return res.status(400).json({
          error: `Payment verification failed: ${verification.error}`
        })
      }
    } catch (verifyErr) {
      // RPC error — don't block the tip
      logger.warn(`Tip verification RPC error, recording tip anyway - Tx: ${transactionSignature}`, verifyErr)
    }

    // Create or update tip interaction
    // Use upsert to allow multiple tips from the same user
    const existingTip = await prisma.interaction.findFirst({
      where: {
        userWallet: walletAddress,
        targetType: 'post',
        targetId: id,
        interactionType: 'tip'
      }
    });

    if (existingTip) {
      // Update existing tip - increment the amount
      // Convert existingTip.amount from Decimal/string to number first
      const existingAmount = typeof existingTip.amount === 'string'
        ? parseFloat(existingTip.amount)
        : Number(existingTip.amount || 0);
      const newAmount = existingAmount + amount;

      await prisma.interaction.update({
        where: { id: existingTip.id },
        data: {
          amount: newAmount
        }
      });
    } else {
      // Create new tip interaction
      await prisma.interaction.create({
        data: {
          userWallet: walletAddress,
          targetType: 'post',
          targetId: id,
          interactionType: 'tip',
          amount: amount
        }
      });
    }

    // Update post tip count and amount
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        tipCount: { increment: 1 },
        tipAmount: { increment: amount }
      }
    })

    // Emit real-time update
    emitPostUpdate(id, {
      tipCount: updatedPost.tipCount,
      tipAmount: updatedPost.tipAmount,
      action: 'tip',
      userWallet: walletAddress,
      amount: Number(amount)
    })

    logger.info(`${walletAddress} tipped ${amount} SOL to post ${id} (tx: ${transactionSignature})`)

    // Award reputation points
    await reputationService.onTipSent(walletAddress, Number(amount))
    await reputationService.onTipReceived(post.authorWallet, Number(amount))

    // Create notification
    await createNotification({
      userId: post.authorWallet,
      type: 'tip',
      fromUserId: walletAddress,
      postId: id,
      amount: Number(amount)
    })

    res.json({
      success: true,
      message: `Tipped ${amount} SOL`,
      amount,
      transactionSignature
    })
  } catch (error) {
    logger.error('Tip post error:', error)
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
      tips: interactions.filter(i => i.interactionType === 'tip')
    }

    res.json({
      success: true,
      interactions: grouped,
      summary: {
        totalLikes: grouped.likes.length,
        totalTips: grouped.tips.length,
        totalTipAmount: grouped.tips.reduce((sum, tip) => sum + Number(tip.amount || 0), 0)
      }
    })
  } catch (error) {
    logger.error('Get interactions error:', error)
    res.status(500).json({ error: 'Failed to get interactions' })
  }
}

export const getUserInteractions = async (req: AuthRequest, res: Response) => {
  try {
    const walletAddress = req.userWallet!
    const { postIds } = req.body

    if (!postIds || !Array.isArray(postIds)) {
      return res.status(400).json({ error: 'postIds array is required' })
    }

    // Get all user's interactions for the specified posts/replies
    // Don't filter by targetType - allow both 'post' and 'reply'
    const interactions = await prisma.interaction.findMany({
      where: {
        userWallet: walletAddress,
        targetId: {
          in: postIds.map(id => String(id))
        }
      },
      select: {
        targetId: true,
        interactionType: true,
        targetType: true
      }
    })

    // Create a map of postId/replyId -> interaction types
    const interactionMap: Record<string, { liked: boolean; tipped: boolean }> = {}

    // Initialize all items as not interacted
    postIds.forEach(id => {
      interactionMap[String(id)] = {
        liked: false,
        tipped: false
      }
    })

    // Update with actual interactions
    interactions.forEach(interaction => {
      if (!interactionMap[interaction.targetId]) {
        interactionMap[interaction.targetId] = {
          liked: false,
          tipped: false
        }
      }

      switch (interaction.interactionType) {
        case 'like':
          interactionMap[interaction.targetId].liked = true
          break
        case 'tip':
          interactionMap[interaction.targetId].tipped = true
          break
      }
    })

    res.json({
      success: true,
      interactions: interactionMap
    })
  } catch (error) {
    logger.error('Get user interactions error:', error)
    res.status(500).json({ error: 'Failed to get user interactions' })
  }
}