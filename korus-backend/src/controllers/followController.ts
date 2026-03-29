import { Response } from 'express'
import prisma from '../config/database'
import { AuthRequest } from '../middleware/auth'
import { logger } from '../utils/logger'
import { createNotification } from '../utils/notifications'
import { resolveNFTAvatar } from './postsController'

const authorSelect = {
  walletAddress: true,
  username: true,
  snsUsername: true,
  nftAvatar: true,
  tier: true,
  themeColor: true,
  bio: true,
  followerCount: true,
  followingCount: true,
}

export const toggleFollow = async (req: AuthRequest, res: Response) => {
  try {
    const { wallet } = req.params
    const followerWallet = req.userWallet!

    if (followerWallet === wallet) {
      return res.status(400).json({ error: 'Cannot follow yourself' })
    }

    // Check target user exists
    const targetUser = await prisma.user.findUnique({ where: { walletAddress: wallet } })
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    const existing = await prisma.follow.findUnique({
      where: {
        followerWallet_followingWallet: {
          followerWallet,
          followingWallet: wallet,
        }
      }
    })

    if (existing) {
      // Unfollow
      await prisma.follow.delete({ where: { id: existing.id } })
      await prisma.user.update({
        where: { walletAddress: wallet },
        data: { followerCount: { decrement: 1 } }
      })
      await prisma.user.update({
        where: { walletAddress: followerWallet },
        data: { followingCount: { decrement: 1 } }
      })

      return res.json({ success: true, following: false })
    }

    // Follow
    await prisma.follow.create({
      data: { followerWallet, followingWallet: wallet }
    })
    await prisma.user.update({
      where: { walletAddress: wallet },
      data: { followerCount: { increment: 1 } }
    })
    await prisma.user.update({
      where: { walletAddress: followerWallet },
      data: { followingCount: { increment: 1 } }
    })

    // Notify
    await createNotification({
      userId: wallet,
      type: 'follow',
      fromUserId: followerWallet,
    })

    logger.info(`${followerWallet} followed ${wallet}`)
    res.json({ success: true, following: true })
  } catch (error) {
    logger.error('Toggle follow error:', error)
    res.status(500).json({ error: 'Failed to toggle follow' })
  }
}

export const getFollowers = async (req: AuthRequest, res: Response) => {
  try {
    const { wallet } = req.params
    const followers = await prisma.follow.findMany({
      where: { followingWallet: wallet },
      include: { follower: { select: authorSelect } },
      orderBy: { createdAt: 'desc' }
    })

    res.json({
      success: true,
      followers: followers.map(f => f.follower),
      count: followers.length
    })
  } catch (error) {
    logger.error('Get followers error:', error)
    res.status(500).json({ error: 'Failed to get followers' })
  }
}

export const getFollowing = async (req: AuthRequest, res: Response) => {
  try {
    const { wallet } = req.params
    const following = await prisma.follow.findMany({
      where: { followerWallet: wallet },
      include: { following: { select: authorSelect } },
      orderBy: { createdAt: 'desc' }
    })

    res.json({
      success: true,
      following: following.map(f => f.following),
      count: following.length
    })
  } catch (error) {
    logger.error('Get following error:', error)
    res.status(500).json({ error: 'Failed to get following' })
  }
}

export const checkFollowing = async (req: AuthRequest, res: Response) => {
  try {
    const walletAddress = req.userWallet!
    const { wallets } = req.body

    if (!wallets || !Array.isArray(wallets)) {
      return res.status(400).json({ error: 'wallets array is required' })
    }

    const follows = await prisma.follow.findMany({
      where: {
        followerWallet: walletAddress,
        followingWallet: { in: wallets }
      },
      select: { followingWallet: true }
    })

    const followingSet = new Set(follows.map(f => f.followingWallet))
    const result: Record<string, boolean> = {}
    wallets.forEach((w: string) => { result[w] = followingSet.has(w) })

    res.json({ success: true, following: result })
  } catch (error) {
    logger.error('Check following error:', error)
    res.status(500).json({ error: 'Failed to check following' })
  }
}

export const getFollowingFeed = async (req: AuthRequest, res: Response) => {
  try {
    const walletAddress = req.userWallet!
    const { limit, cursor } = req.query

    // Get wallets this user follows
    const follows = await prisma.follow.findMany({
      where: { followerWallet: walletAddress },
      select: { followingWallet: true }
    })

    const followedWallets = follows.map(f => f.followingWallet)

    if (followedWallets.length === 0) {
      return res.json({
        success: true,
        posts: [],
        pagination: { hasMore: false, cursor: null }
      })
    }

    const take = limit ? parseInt(limit as string) : 20

    const authorInclude = {
      select: {
        walletAddress: true,
        tier: true,
        genesisVerified: true,
        snsUsername: true,
        username: true,
        nftAvatar: true,
        themeColor: true,
      }
    }

    // Date-based cursor filter for pagination (works across merged posts + replies)
    const cursorDate = cursor ? new Date(cursor as string) : undefined
    const dateFilter = cursorDate ? { createdAt: { lt: cursorDate } } : {}

    // Fetch posts and replies from followed users in parallel
    const [posts, replies] = await Promise.all([
      prisma.post.findMany({
        where: {
          authorWallet: { in: followedWallets },
          isHidden: false,
          isShoutout: false,
          game: null,
          ...dateFilter,
        },
        include: {
          author: authorInclude,
          originalPost: {
            include: { author: authorInclude }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: take + 1,
      }),
      prisma.reply.findMany({
        where: {
          authorWallet: { in: followedWallets },
          isHidden: false,
          parentReplyId: null, // Only top-level replies
          ...dateFilter,
        },
        include: {
          author: authorInclude,
          post: {
            select: {
              id: true,
              authorWallet: true,
              content: true,
              author: authorInclude,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: take + 1,
      })
    ])

    // Transform replies into post-like objects for the feed
    const replyPosts = replies.map(reply => ({
      id: `reply-${reply.id}`,
      replyId: reply.id,
      content: reply.content,
      authorWallet: reply.authorWallet,
      author: reply.author,
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt,
      imageUrl: reply.imageUrl,
      videoUrl: reply.videoUrl,
      likeCount: reply.likeCount,
      replyCount: 0,
      repostCount: 0,
      tipCount: reply.tipCount,
      tipAmount: 0,
      isRepost: false,
      isShoutout: false,
      isHidden: false,
      isReply: true,
      parentPostId: reply.postId,
      replyingToUser: reply.post.author?.snsUsername || reply.post.author?.username || reply.post.authorWallet?.slice(0, 15) || 'Unknown',
    }))

    // Merge and sort by createdAt descending
    const merged = [...posts, ...replyPosts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, take + 1)

    const hasMore = merged.length > take
    const resultPosts = hasMore ? merged.slice(0, take) : merged
    const nextCursor = hasMore && resultPosts.length > 0
      ? resultPosts[resultPosts.length - 1].createdAt.toISOString()
      : null

    // Resolve NFT avatar mints to image URLs (parallel)
    await Promise.all(resultPosts.map(async (item: any) => {
      if (item.author?.nftAvatar) {
        item.author.nftAvatar = await resolveNFTAvatar(item.author.nftAvatar)
      }
      if (item.originalPost?.author?.nftAvatar) {
        item.originalPost.author.nftAvatar = await resolveNFTAvatar(item.originalPost.author.nftAvatar)
      }
    }))

    res.json({
      success: true,
      posts: resultPosts,
      pagination: { hasMore, cursor: nextCursor }
    })
  } catch (error) {
    logger.error('Get following feed error:', error)
    res.status(500).json({ error: 'Failed to get following feed' })
  }
}
