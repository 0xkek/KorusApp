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

/**
 * Both follow lists are public and unauthenticated, and both page the same
 * way. `count` stays the TOTAL rather than the page length, so a caller can
 * render "1,204 followers" while holding only the first page.
 */
const FOLLOW_PAGE_SIZE = 30
const FOLLOW_PAGE_MAX = 100

function pageParams(req: AuthRequest) {
  const limit = Math.min(
    Math.max(parseInt(String(req.query.limit ?? FOLLOW_PAGE_SIZE), 10) || FOLLOW_PAGE_SIZE, 1),
    FOLLOW_PAGE_MAX
  )
  const offset = Math.max(parseInt(String(req.query.offset ?? 0), 10) || 0, 0)
  return { limit, offset }
}

export const getFollowers = async (req: AuthRequest, res: Response) => {
  try {
    const { wallet } = req.params
    const { limit, offset } = pageParams(req)

    const [rows, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followingWallet: wallet },
        include: { follower: { select: authorSelect } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.follow.count({ where: { followingWallet: wallet } }),
    ])

    res.json({
      success: true,
      followers: rows.map(f => f.follower),
      count: total,
      hasMore: offset + rows.length < total,
    })
  } catch (error) {
    logger.error('Get followers error:', error)
    res.status(500).json({ error: 'Failed to get followers' })
  }
}

export const getFollowing = async (req: AuthRequest, res: Response) => {
  try {
    const { wallet } = req.params
    const { limit, offset } = pageParams(req)

    const [rows, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followerWallet: wallet },
        include: { following: { select: authorSelect } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.follow.count({ where: { followerWallet: wallet } }),
    ])

    res.json({
      success: true,
      following: rows.map(f => f.following),
      count: total,
      hasMore: offset + rows.length < total,
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

/**
 * Suggested accounts to follow.
 *
 * New users land on an empty Following feed with no way to fill it. This ranks
 * active accounts by reputation so there is always a starting point.
 * Excludes the caller and anyone they already follow. Works unauthenticated
 * too, so the suggestions can render before a wallet connects.
 */
export const getSuggestedFollows = async (req: AuthRequest, res: Response) => {
  try {
    const walletAddress = req.userWallet
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 25)

    const exclude: string[] = []
    if (walletAddress) {
      exclude.push(walletAddress)
      const following = await prisma.follow.findMany({
        where: { followerWallet: walletAddress },
        select: { followingWallet: true },
      })
      exclude.push(...following.map(f => f.followingWallet))
    }

    const users = await prisma.user.findMany({
      where: {
        ...(exclude.length ? { walletAddress: { notIn: exclude } } : {}),
        isSuspended: false,
        // Only suggest accounts that have actually posted — following an empty
        // account does nothing to fill the feed.
        posts: { some: { isHidden: false } },
      },
      select: { ...authorSelect, reputationScore: true },
      orderBy: [
        { reputationScore: 'desc' },
        { followerCount: 'desc' },
      ],
      take: limit,
    })

    const withAvatars = await Promise.all(
      users.map(async (u: any) => ({
        ...u,
        nftAvatar: await resolveNFTAvatar(u.nftAvatar),
      }))
    )

    res.json({ success: true, users: withAvatars })
  } catch (error) {
    logger.error('Get suggested follows error:', error)
    res.status(500).json({ error: 'Failed to get suggestions' })
  }
}
