import { logger } from '../utils/logger'
import { Request, Response } from 'express'
import prisma from '../config/database'
import { AuthRequest } from '../middleware/auth'
import { reputationService } from '../services/reputationService'
import { createNotification } from '../utils/notifications'
import SolPaymentService from '../services/solPaymentService'
import { emitPostUpdate, emitNewPost } from '../config/socket'

// Replay protection: track recently used tip transaction signatures
// Entries expire after 15 minutes to prevent memory leaks
const usedTipSignatures = new Map<string, number>()
const TIP_SIG_TTL_MS = 15 * 60 * 1000

function isTipSignatureUsed(signature: string): boolean {
  const timestamp = usedTipSignatures.get(signature)
  if (!timestamp) return false
  if (Date.now() - timestamp > TIP_SIG_TTL_MS) {
    usedTipSignatures.delete(signature)
    return false
  }
  return true
}

function markTipSignatureUsed(signature: string): void {
  usedTipSignatures.set(signature, Date.now())
  // Cleanup old entries periodically (every 100 insertions)
  if (usedTipSignatures.size % 100 === 0) {
    const now = Date.now()
    for (const [sig, ts] of usedTipSignatures) {
      if (now - ts > TIP_SIG_TTL_MS) usedTipSignatures.delete(sig)
    }
  }
}

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

    // Replay protection: reject duplicate transaction signatures
    if (isTipSignatureUsed(transactionSignature)) {
      logger.warn(`Duplicate tip transaction signature rejected: ${transactionSignature}`)
      return res.status(409).json({ error: 'Transaction signature already used' })
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

    // Verify SOL transaction on-chain — REQUIRED for tip recording
    logger.debug(`Verifying tip transaction - From: ${walletAddress}, To: ${post.authorWallet}, Amount: ${amount} SOL, Tx: ${transactionSignature}`)

    let verifiedAmount: number;
    try {
      const verification = await SolPaymentService.verifyTransaction(
        walletAddress, // From wallet (tipper)
        post.authorWallet, // To wallet (post author)
        transactionSignature, // Transaction signature to verify
        amount, // Expected amount in SOL
        10 // Max age in minutes
      )

      if (verification.valid) {
        // Use the on-chain verified amount, not what the frontend claimed
        verifiedAmount = verification.actualAmount || amount;
        logger.info(`Tip transaction verified on-chain - From: ${walletAddress}, To: ${post.authorWallet}, Amount: ${verifiedAmount} SOL, Tx: ${transactionSignature}`)
      } else {
        // Transaction not found, failed, wrong wallets, or wrong amount — reject
        logger.warn(`Tip transaction verification failed for ${walletAddress}: ${verification.error}`)
        return res.status(400).json({
          error: `Payment verification failed: ${verification.error}`
        })
      }
    } catch (verifyErr) {
      // RPC error — reject the tip rather than trusting frontend amount
      logger.error(`Tip verification RPC error - Tx: ${transactionSignature}`, verifyErr)
      return res.status(503).json({
        error: 'Unable to verify transaction on-chain. Please try again.'
      })
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
      const newAmount = existingAmount + verifiedAmount;

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
          amount: verifiedAmount
        }
      });
    }

    // Update post tip count and amount
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        tipCount: { increment: 1 },
        tipAmount: { increment: verifiedAmount }
      }
    })

    // Emit real-time update
    emitPostUpdate(id, {
      tipCount: updatedPost.tipCount,
      tipAmount: updatedPost.tipAmount,
      action: 'tip',
      userWallet: walletAddress,
      amount: verifiedAmount
    })

    // Mark signature as used to prevent replay
    markTipSignatureUsed(transactionSignature)

    logger.info(`${walletAddress} tipped ${verifiedAmount} SOL to post ${id} (tx: ${transactionSignature})`)

    // Award reputation points
    await reputationService.onTipSent(walletAddress, verifiedAmount)
    await reputationService.onTipReceived(post.authorWallet, verifiedAmount)

    // Create notification
    await createNotification({
      userId: post.authorWallet,
      type: 'tip',
      fromUserId: walletAddress,
      postId: id,
      amount: verifiedAmount
    })

    res.json({
      success: true,
      message: `Tipped ${verifiedAmount} SOL`,
      amount: verifiedAmount,
      transactionSignature
    })
  } catch (error) {
    logger.error('Tip post error:', error)
    res.status(500).json({ error: 'Failed to tip post' })
  }
}

/**
 * Get tip history for a specific wallet (sent and received)
 */
export const getTipHistory = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params

    if (!walletAddress || walletAddress.length < 32 || walletAddress.length > 44) {
      return res.status(400).json({ success: false, error: 'Invalid wallet address' })
    }

    // Tips sent by this wallet
    const tipsSent = await prisma.interaction.findMany({
      where: {
        userWallet: walletAddress,
        interactionType: 'tip'
      },
      include: {
        user: { select: { walletAddress: true, username: true, snsUsername: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    // Get post info for sent tips (who received them)
    const sentPostIds = tipsSent.map(t => t.targetId)
    const sentPosts = sentPostIds.length > 0 ? await prisma.post.findMany({
      where: { id: { in: sentPostIds } },
      select: {
        id: true,
        content: true,
        authorWallet: true,
        author: { select: { walletAddress: true, username: true, snsUsername: true } }
      }
    }) : []
    const postMap = new Map(sentPosts.map(p => [p.id, p]))

    // Tips received: find interactions on this user's posts
    const tipsReceived = await prisma.interaction.findMany({
      where: {
        interactionType: 'tip',
        targetId: {
          in: (await prisma.post.findMany({
            where: { authorWallet: walletAddress },
            select: { id: true },
            take: 200
          })).map(p => p.id)
        },
        NOT: { userWallet: walletAddress } // exclude self
      },
      include: {
        user: { select: { walletAddress: true, username: true, snsUsername: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    // Get post info for received tips
    const receivedPostIds = tipsReceived.map(t => t.targetId)
    const receivedPosts = receivedPostIds.length > 0 ? await prisma.post.findMany({
      where: { id: { in: receivedPostIds } },
      select: { id: true, content: true }
    }) : []
    const receivedPostMap = new Map(receivedPosts.map(p => [p.id, p]))

    const getDisplayName = (user: { walletAddress: string; username: string | null; snsUsername: string | null } | null) => {
      if (!user) return null
      return user.username || user.snsUsername || null
    }

    const sent = tipsSent.map(t => {
      const post = postMap.get(t.targetId)
      return {
        id: t.id,
        direction: 'sent' as const,
        amount: t.amount?.toString() || '0',
        recipientWallet: post?.authorWallet || null,
        recipientDisplayName: getDisplayName(post?.author || null),
        postId: t.targetId,
        postPreview: post?.content?.slice(0, 80) || null,
        createdAt: t.createdAt.toISOString()
      }
    })

    const received = tipsReceived.map(t => {
      const post = receivedPostMap.get(t.targetId)
      return {
        id: t.id,
        direction: 'received' as const,
        amount: t.amount?.toString() || '0',
        senderWallet: t.userWallet,
        senderDisplayName: getDisplayName(t.user),
        postId: t.targetId,
        postPreview: post?.content?.slice(0, 80) || null,
        createdAt: t.createdAt.toISOString()
      }
    })

    // Merge and sort by date
    const all = [...sent, ...received].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    const totalSent = sent.reduce((sum, t) => sum + parseFloat(t.amount), 0)
    const totalReceived = received.reduce((sum, t) => sum + parseFloat(t.amount), 0)

    res.json({
      success: true,
      tips: all,
      stats: {
        totalSent: totalSent.toFixed(4),
        totalReceived: totalReceived.toFixed(4),
        tipsSentCount: sent.length,
        tipsReceivedCount: received.length
      }
    })
  } catch (error) {
    logger.error('Get tip history error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch tip history' })
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

    // Check which posts the user has reposted
    const userReposts = await prisma.post.findMany({
      where: {
        authorWallet: walletAddress,
        isRepost: true,
        originalPostId: { in: postIds.map(id => String(id)) }
      },
      select: { originalPostId: true }
    })
    const repostedPostIds = new Set(userReposts.map(r => r.originalPostId).filter(Boolean))

    // Create a map of postId/replyId -> interaction types
    const interactionMap: Record<string, { liked: boolean; tipped: boolean; reposted: boolean }> = {}

    // Initialize all items as not interacted
    postIds.forEach(id => {
      interactionMap[String(id)] = {
        liked: false,
        tipped: false,
        reposted: repostedPostIds.has(String(id))
      }
    })

    // Update with actual interactions
    interactions.forEach(interaction => {
      if (!interactionMap[interaction.targetId]) {
        interactionMap[interaction.targetId] = {
          liked: false,
          tipped: false,
          reposted: repostedPostIds.has(interaction.targetId)
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

const authorSelect = {
  walletAddress: true,
  tier: true,
  genesisVerified: true,
  snsUsername: true,
  username: true,
  nftAvatar: true,
  themeColor: true
}

export const repostPost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const walletAddress = req.userWallet!
    const { comment } = req.body

    // Check if post exists
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // Can't repost your own post
    if (post.authorWallet === walletAddress) {
      return res.status(400).json({ error: 'Cannot repost your own post' })
    }

    // Check if user already reposted this post
    const existingRepost = await prisma.post.findFirst({
      where: {
        authorWallet: walletAddress,
        isRepost: true,
        originalPostId: id
      }
    })

    if (existingRepost) {
      // Undo repost — delete the repost post and decrement count
      await prisma.post.delete({ where: { id: existingRepost.id } })
      await prisma.post.update({
        where: { id },
        data: { repostCount: { decrement: 1 } }
      })

      return res.json({
        success: true,
        reposted: false,
        message: 'Repost removed'
      })
    }

    // Create repost as a new post that references the original
    const repost = await prisma.post.create({
      data: {
        authorWallet: walletAddress,
        content: comment || '',
        isRepost: true,
        originalPostId: id,
        repostComment: comment || null
      },
      include: {
        author: { select: authorSelect },
        originalPost: {
          include: {
            author: { select: authorSelect }
          }
        }
      }
    })

    // Increment repost count on original post
    await prisma.post.update({
      where: { id },
      data: { repostCount: { increment: 1 } }
    })

    // Emit via WebSocket
    emitNewPost(repost)

    logger.info(`${walletAddress} reposted post ${id}`)

    res.json({
      success: true,
      reposted: true,
      repostPost: repost,
      message: 'Reposted successfully'
    })
  } catch (error) {
    logger.error('Repost error:', error)
    res.status(500).json({ error: 'Failed to repost' })
  }
}