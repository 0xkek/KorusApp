import { logger } from '../utils/logger'
import { Request, Response } from 'express'
import prisma from '../config/database'
import { AuthRequest } from '../middleware/auth'
import { CreatePostRequest, ApiResponse, PaginatedResponse, Post } from '../types'
import { autoModerate } from './moderationController'
import { reputationService } from '../services/reputationService'
import { CursorPagination } from '../utils/pagination'
import SolPaymentService from '../services/solPaymentService'
import { TREASURY_WALLET } from '../config/solana'
import { getNFTByMint } from '../services/nftService'
import { emitNewPost } from '../config/socket'
import { processMentions } from '../utils/mentions'
import { userCache } from '../utils/cache'

const NFT_AVATAR_TTL = 60 * 60 * 1000 // 1 hour

// In-flight NFT lookups, keyed by mint. A feed page is transformed with
// Promise.all, so every post by the same author hits resolveNFTAvatar
// concurrently and all of them miss the cache before any one populates it —
// producing N identical getNFTByMint calls for a single mint. Sharing the
// pending promise collapses those into one request.
const inFlightAvatarLookups = new Map<string, Promise<string | null>>()

// Helper function to resolve NFT avatar mints to image URLs (cached)
export async function resolveNFTAvatar(nftMint: string | null): Promise<string | null> {
  if (!nftMint) return null
  // If it's already a URL, return as-is
  if (nftMint.startsWith('http://') || nftMint.startsWith('https://')) return nftMint

  const cacheKey = `nft-avatar:${nftMint}`
  const cached = await userCache.get<string>(cacheKey)
  if (cached) return cached

  const pending = inFlightAvatarLookups.get(nftMint)
  if (pending) return pending

  const lookup = (async () => {
    try {
      const nft = await getNFTByMint(nftMint)
      const result = nft?.image || nftMint
      await userCache.set(cacheKey, result, NFT_AVATAR_TTL)
      return result
    } catch (error) {
      logger.error(`Failed to resolve NFT avatar ${nftMint}:`, error)
      return nftMint // Preserve original value on error
    } finally {
      inFlightAvatarLookups.delete(nftMint)
    }
  })()

  inFlightAvatarLookups.set(nftMint, lookup)
  return lookup
}

// Sanitize author display fields — __wallet__ is a sentinel meaning "show wallet address"
function sanitizeAuthorDisplay(author: any) {
  if (author?.snsUsername === '__wallet__') {
    author.snsUsername = null
    author.username = null
  }
}

// Apply Cloudinary transforms to image URLs for optimized delivery
// Inserts transform params after /upload/ in Cloudinary URLs
function cloudinaryTransform(url: string | null | undefined, transforms: string): string | null | undefined {
  if (!url || typeof url !== 'string') return url
  // Only transform Cloudinary URLs (match /image/upload/ pattern)
  const uploadMarker = '/image/upload/'
  const idx = url.indexOf(uploadMarker)
  if (idx === -1) return url
  // Don't double-transform if already has params after /upload/
  const afterUpload = url.substring(idx + uploadMarker.length)
  if (afterUpload.startsWith('w_') || afterUpload.startsWith('f_') || afterUpload.startsWith('q_') || afterUpload.startsWith('c_')) return url
  return url.substring(0, idx + uploadMarker.length) + transforms + '/' + afterUpload
}

// Optimized Cloudinary transforms for different contexts
const FEED_IMAGE_TRANSFORM = 'w_600,f_auto,q_auto'
const AVATAR_TRANSFORM = 'w_80,h_80,c_fill,f_auto,q_auto'

// Transform post author avatars from mint addresses to image URLs
async function transformPostAvatars(post: any): Promise<any> {
  if (post.author) {
    sanitizeAuthorDisplay(post.author)
    if (post.author.nftAvatar) {
      post.author.nftAvatar = await resolveNFTAvatar(post.author.nftAvatar)
    }
  }
  // Transform originalPost author avatar (for reposts)
  if (post.originalPost?.author) {
    sanitizeAuthorDisplay(post.originalPost.author)
    if (post.originalPost.author.nftAvatar) {
      post.originalPost.author.nftAvatar = await resolveNFTAvatar(post.originalPost.author.nftAvatar)
    }
  }
  // Transform reply authors' avatars (parallel)
  if (post.replies && Array.isArray(post.replies)) {
    await Promise.all(post.replies.map(async (reply: any) => {
      if (reply.author) {
        sanitizeAuthorDisplay(reply.author)
        if (reply.author.nftAvatar) {
          reply.author.nftAvatar = await resolveNFTAvatar(reply.author.nftAvatar)
        }
      }
    }))
  }

  // Apply Cloudinary image optimizations
  post.imageUrl = cloudinaryTransform(post.imageUrl, FEED_IMAGE_TRANSFORM)
  if (post.originalPost) {
    post.originalPost.imageUrl = cloudinaryTransform(post.originalPost.imageUrl, FEED_IMAGE_TRANSFORM)
  }
  if (post.originalReply) {
    post.originalReply.imageUrl = cloudinaryTransform(post.originalReply.imageUrl, FEED_IMAGE_TRANSFORM)
  }
  if (post.replies && Array.isArray(post.replies)) {
    for (const reply of post.replies) {
      reply.imageUrl = cloudinaryTransform(reply.imageUrl, FEED_IMAGE_TRANSFORM)
    }
  }

  return post
}

export const createPost = async (req: AuthRequest, res: Response<ApiResponse<Post>>) => {
  try {
    const walletAddress = req.userWallet!
    let { content, imageUrl, videoUrl, shoutoutDuration, transactionSignature } = req.body

    // If imageUrl is a base64 data URL, upload it to Cloudinary
    if (imageUrl && imageUrl.startsWith('data:image/')) {
      try {
        const cloudinary = (await import('../config/cloudinary')).default
        const uploadResult = await cloudinary.uploader.upload(imageUrl, {
          folder: 'korus-posts',
          resource_type: 'image'
        })
        imageUrl = uploadResult.secure_url
        logger.debug(`Base64 image uploaded to Cloudinary: ${imageUrl}`)
      } catch (uploadError) {
        logger.error('Failed to upload base64 image:', uploadError)
        return res.status(400).json({
          success: false,
          error: 'Failed to upload image'
        } as any)
      }
    }

    // Validate input - require either content or media.
    // Check the trimmed value: whitespace-only content is truthy and used to
    // slip through here, then got trimmed to '' on save, producing posts that
    // render as blank cards in the feed.
    if (!content?.trim() && !imageUrl && !videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Post must have either content or media (image/video)'
      } as any)
    }

    if (content && content.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Content must be 500 characters or less'
      } as any)
    }

    // Calculate shoutout fields if this is a shoutout post
    let shoutoutData: any = {}
    if (shoutoutDuration) {
      // Pricing logic (matches frontend)
      const shoutoutPrices: { [key: number]: number } = {
        10: 0.05,
        20: 0.10,
        30: 0.18,
        60: 0.35,
        120: 0.70,
        180: 1.30,
        240: 2.00
      }

      const price = shoutoutPrices[shoutoutDuration]
      if (!price) {
        return res.status(400).json({
          success: false,
          error: 'Invalid shoutout duration'
        } as any)
      }

      // Require transaction signature for shoutout posts
      if (!transactionSignature) {
        return res.status(400).json({
          success: false,
          error: 'Payment transaction signature required for shoutout posts'
        } as any)
      }

      // Verify the SOL transaction on-chain
      logger.debug(`Verifying shoutout payment - Duration: ${shoutoutDuration} minutes, Price: ${price} SOL, Tx: ${transactionSignature}`)

      const verification = await SolPaymentService.verifyTransaction(
        walletAddress, // From wallet (user)
        TREASURY_WALLET.toBase58(), // To wallet (platform treasury)
        transactionSignature, // Transaction signature to verify
        price, // Expected amount in SOL
        10 // Max age in minutes
      )

      if (!verification.valid) {
        logger.warn(`Shoutout payment verification failed for ${walletAddress}: ${verification.error}`)
        return res.status(400).json({
          success: false,
          error: `Payment verification failed: ${verification.error}`
        } as any)
      }

      logger.info(`Shoutout payment verified successfully - User: ${walletAddress}, Amount: ${verification.actualAmount} SOL, Tx: ${transactionSignature}`)

      // Set shoutout fields — do NOT set expiresAt yet.
      // The timer only starts when the shoutout becomes the active one
      // (i.e., when getPosts serves it as the active shoutout).
      shoutoutData = {
        isShoutout: true,
        shoutoutDuration,
        shoutoutExpiresAt: null, // Will be set when this shoutout becomes active
        shoutoutPrice: price,
        shoutoutTxSignature: transactionSignature
      }
    }

    // Create post
    const post = await prisma.post.create({
      data: {
        authorWallet: walletAddress,
        content: content ? content.trim() : '',
        imageUrl: imageUrl || undefined,
        videoUrl: videoUrl || undefined,
        ...shoutoutData
        // topic and subtopic are now optional
      },
      include: {
        author: {
          select: {
            walletAddress: true,
            tier: true,
            genesisVerified: true,
            snsUsername: true,
            username: true,
            nftAvatar: true,
            themeColor: true
          }
        }
      }
    })

    logger.debug(`New post created by ${walletAddress}: ${content ? content.substring(0, 50) : '[image/video only]'}...`)

    // Run auto-moderation on the new post
    // TODO: Re-enable after fixing deployment
    // await autoModerate('post', post.id, content)

    // Award reputation points for creating a post
    const hasMedia = !!(imageUrl || videoUrl);
    await reputationService.onPostCreated(walletAddress, hasMedia)

    // Award extra reputation for shoutout purchase
    if (shoutoutData.isShoutout && shoutoutData.shoutoutPrice) {
      await reputationService.onShoutoutPurchased(walletAddress, shoutoutData.shoutoutPrice, shoutoutData.shoutoutDuration)
    }

    // Process @mentions and send notifications (fire-and-forget)
    if (content) {
      processMentions(content, walletAddress, post.id).catch(err => logger.error('Mention processing failed:', err))
    }

    // Transform NFT avatar mint address to image URL
    const transformedPost = await transformPostAvatars(post)

    // Emit new post to all connected WebSocket clients
    emitNewPost(transformedPost)

    res.status(201).json({
      success: true,
      post: transformedPost
    } as any)
  } catch (error) {
    logger.error('Create post error:', error)
    res.status(500).json({ success: false, error: 'Failed to create post' })
  }
}

export const getPosts = async (req: Request, res: Response) => {
  try {
    const { cursor, limit, maxId, sinceId, authorWallet } = req.query

    // If filtering by author, return their posts directly (no shoutout logic needed)
    if (authorWallet && typeof authorWallet === 'string') {
      const result = await CursorPagination.paginateQuery<any>(
        prisma.post,
        {
          cursor: cursor as string,
          limit: limit ? parseInt(limit as string) : undefined,
          maxId: maxId as string,
          sinceId: sinceId as string
        },
        {
          where: {
            isHidden: false,
            authorWallet: authorWallet,
            game: null,
            OR: [
              { content: { not: '' } },
              { imageUrl: { not: null } },
            ],
          },
          include: {
            author: {
              select: {
                walletAddress: true,
                tier: true,
                genesisVerified: true,
                snsUsername: true,
                username: true,
                nftAvatar: true,
                themeColor: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      )

      const postsWithAvatars = await Promise.all(
        result.data.map(async (post: any) => await transformPostAvatars({
          ...post,
          replies: []
        }))
      )

      return res.json({
        success: true,
        posts: postsWithAvatars,
        meta: result.meta,
        pagination: {
          limit: result.meta.resultCount,
          cursor: result.meta.nextCursor,
          hasMore: result.meta.hasMore
        }
      })
    }

    // Fetch all non-hidden shoutouts in a single query (active + queued)
    const now = new Date()
    const authorSelect = {
      walletAddress: true,
      tier: true,
      genesisVerified: true,
      snsUsername: true,
      username: true,
      nftAvatar: true,
      themeColor: true
    }

    // Exactly one shoutout is promoted at a time; the rest wait in a queue
    // ordered by purchase time. Fetch the active one directly rather than
    // scanning the whole shoutout set — the old `take: 20` scan ran on every
    // feed load and could miss the active shoutout entirely once 20+ older
    // queued entries existed.
    let activeShoutout = await prisma.post.findFirst({
      where: {
        isHidden: false,
        isShoutout: true,
        shoutoutExpiresAt: { gt: now }
      },
      include: { author: { select: authorSelect } },
      orderBy: { shoutoutExpiresAt: 'asc' }
    })

    // Promotion normally happens in the shoutout maintenance job, but activate
    // opportunistically here too so the slot fills immediately after one frees.
    if (!activeShoutout) {
      const nextQueued = await prisma.post.findFirst({
        where: { isHidden: false, isShoutout: true, shoutoutExpiresAt: null },
        orderBy: { createdAt: 'asc' },
        select: { id: true, shoutoutDuration: true }
      })

      if (nextQueued) {
        const expiresAt = new Date()
        expiresAt.setMinutes(expiresAt.getMinutes() + (nextQueued.shoutoutDuration || 10))

        // Guarded so a concurrent request or the maintenance job can't
        // double-start the same shoutout and shorten someone's paid window.
        const claimed = await prisma.post.updateMany({
          where: { id: nextQueued.id, shoutoutExpiresAt: null },
          data: { shoutoutExpiresAt: expiresAt }
        })

        if (claimed.count > 0) {
          logger.info(`Activated queued shoutout ${nextQueued.id} — expires at ${expiresAt.toISOString()}`)
        }

        // Re-read whoever holds the slot now (this request or a concurrent one).
        activeShoutout = await prisma.post.findFirst({
          where: { isHidden: false, isShoutout: true, shoutoutExpiresAt: { gt: new Date() } },
          include: { author: { select: authorSelect } },
          orderBy: { shoutoutExpiresAt: 'asc' }
        })
      }
    }

    const activeShoutouts = activeShoutout ? [activeShoutout] : []

    // Queue preview, oldest purchase first. Capped for payload size, but
    // queueLength below reports the true total.
    const [queuedShoutouts, queuedTotal] = await Promise.all([
      prisma.post.findMany({
        where: { isHidden: false, isShoutout: true, shoutoutExpiresAt: null },
        orderBy: { createdAt: 'asc' },
        take: 20,
        select: {
          id: true,
          content: true,
          authorWallet: true,
          shoutoutDuration: true,
          createdAt: true,
          shoutoutExpiresAt: true
        }
      }),
      prisma.post.count({
        where: { isHidden: false, isShoutout: true, shoutoutExpiresAt: null }
      })
    ])

    // Then get regular posts using cursor pagination (excluding ALL shoutout posts and game dummy posts)
    const result = await CursorPagination.paginateQuery<any>(
      prisma.post,
      {
        cursor: cursor as string,
        limit: limit ? parseInt(limit as string) : undefined,
        maxId: maxId as string,
        sinceId: sinceId as string
      },
      {
        where: {
          isHidden: false,
          isShoutout: false, // Only show non-shoutout posts in regular feed
          game: null, // Exclude posts that are linked to games
          // Skip posts with neither text nor media — they render as an empty
          // card. The author-filtered branch above already does this; the main
          // feed did not, so legacy blank rows still showed up.
          OR: [
            { content: { not: '' } },
            { imageUrl: { not: null } },
            { videoUrl: { not: null } },
          ]
        },
        include: {
          author: {
            select: {
              walletAddress: true,
              tier: true,
              genesisVerified: true,
              snsUsername: true,
              username: true,
              nftAvatar: true,
              themeColor: true
            }
          },
          originalPost: {
            include: {
              author: {
                select: {
                  walletAddress: true,
                  tier: true,
                  genesisVerified: true,
                  snsUsername: true,
                  username: true,
                  nftAvatar: true,
                  themeColor: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    )

    // Resolve NFT avatars to image URLs for all posts
    const postsWithAvatars = await Promise.all([
      ...activeShoutouts.map(async (post: any) => await transformPostAvatars({
        ...post,
        replies: []
      })),
      ...result.data.map(async (post: any) => await transformPostAvatars({
        ...post,
        replies: []
      }))
    ])

    res.json({
      success: true,
      posts: postsWithAvatars,
      meta: result.meta,
      pagination: {
        limit: result.meta.resultCount,
        cursor: result.meta.nextCursor,
        hasMore: result.meta.hasMore
      },
      shoutoutQueue: {
        active: activeShoutout ? {
          id: activeShoutout.id,
          duration: activeShoutout.shoutoutDuration,
          expiresAt: activeShoutout.shoutoutExpiresAt,
          content: activeShoutout.content
        } : null,
        // position is 1-based; startsAt is an estimate built from the active
        // shoutout's remaining time plus the durations of everyone ahead, so a
        // buyer can see when their slot actually begins instead of waiting blind.
        queued: (() => {
          const activeRemainingMs = activeShoutout?.shoutoutExpiresAt
            ? Math.max(0, new Date(activeShoutout.shoutoutExpiresAt).getTime() - now.getTime())
            : 0
          let cumulativeMs = activeRemainingMs

          return queuedShoutouts.map((s, i) => {
            const startsAt = new Date(now.getTime() + cumulativeMs)
            cumulativeMs += (s.shoutoutDuration || 10) * 60 * 1000
            return {
              id: s.id,
              authorWallet: s.authorWallet,
              duration: s.shoutoutDuration,
              expiresAt: s.shoutoutExpiresAt,
              position: i + 1,
              startsAt,
              waitMinutes: Math.round((startsAt.getTime() - now.getTime()) / 60000),
              content: s.content?.substring(0, 50) || '' // First 50 chars for preview
            }
          })
        })(),
        queueLength: queuedTotal
      }
    })
  } catch (error: any) {
    logger.error('Get posts error:', error)
    logger.error('Error stack:', error?.stack)
    res.status(500).json({
      success: false,
      error: 'Failed to get posts'
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
            genesisVerified: true,
            snsUsername: true,
            username: true,
            nftAvatar: true,
            themeColor: true,
            subscriptionStatus: true,
            subscriptionType: true
          }
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                walletAddress: true,
                tier: true,
                genesisVerified: true,
                snsUsername: true,
                username: true,
                nftAvatar: true,
                themeColor: true,
                subscriptionStatus: true,
                subscriptionType: true
              }
            }
          }
        }
      }
    })

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' })
    }

    // Check if it's an expired shoutout post
    if (post.isShoutout && post.shoutoutExpiresAt) {
      const now = new Date()
      if (post.shoutoutExpiresAt < now) {
        return res.status(404).json({ success: false, error: 'Post has expired' })
      }
    }

    // Transform NFT avatar mint addresses to image URLs
    const transformedPost = await transformPostAvatars(post)

    res.json({
      success: true,
      post: transformedPost
    } as any)
  } catch (error) {
    logger.error('Get single post error:', error)
    res.status(500).json({ success: false, error: 'Failed to get post' })
  }
}

export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const walletAddress = req.userWallet!

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id }
    })

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' })
    }

    // Check if user owns the post
    if (post.authorWallet !== walletAddress) {
      return res.status(403).json({ success: false, error: 'You can only delete your own posts' })
    }

    // Delete the post (cascade will delete related records)
    await prisma.post.delete({
      where: { id }
    })

    logger.debug(`Post deleted by ${walletAddress}: ${id}`)

    res.json({
      success: true,
      message: 'Post deleted successfully'
    })
  } catch (error) {
    logger.error('Delete post error:', error)
    res.status(500).json({ success: false, error: 'Failed to delete post' })
  }
}

export const getTrendingPosts = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 50)
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0)

    // Trending prefers recent activity, but a strict window leaves the tab
    // empty during quiet periods. Widen progressively until we find enough
    // engaged posts, so trending always has something to show.
    const WINDOW_HOURS = [48, 24 * 7, 24 * 30, null] as const

    const authorSelect = {
      walletAddress: true,
      tier: true,
      genesisVerified: true,
      snsUsername: true,
      username: true,
      nftAvatar: true,
      themeColor: true
    }

    const buildWhere = (hours: number | null) => ({
      isHidden: false,
      isShoutout: false,
      game: null,
      ...(hours === null
        ? {}
        : { createdAt: { gte: new Date(Date.now() - hours * 60 * 60 * 1000) } }),
      OR: [
        { likeCount: { gt: 0 } },
        { replyCount: { gt: 0 } },
        { repostCount: { gt: 0 } },
        { tipCount: { gt: 0 } },
      ],
    })

    let posts: any[] = []
    for (const hours of WINDOW_HOURS) {
      posts = await prisma.post.findMany({
        where: buildWhere(hours),
        include: {
          author: { select: authorSelect },
          originalPost: {
            include: {
              author: { select: authorSelect }
            }
          }
        },
        orderBy: [
          { likeCount: 'desc' },
          { replyCount: 'desc' },
          { tipCount: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: offset,
        take: limit + 1, // Fetch one extra to determine hasMore
      })

      // Stop at the first window that fills the page; the last entry (null =
      // all time) is the final fallback regardless of how many it returns.
      if (posts.length > limit) break
    }

    const hasMore = posts.length > limit
    const resultPosts = hasMore ? posts.slice(0, limit) : posts

    const postsWithAvatars = await Promise.all(
      resultPosts.map(async (post: any) => await transformPostAvatars({
        ...post,
        replies: []
      }))
    )

    res.json({
      success: true,
      posts: postsWithAvatars,
      pagination: {
        limit,
        offset,
        hasMore
      }
    })
  } catch (error: any) {
    logger.error('Get trending posts error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get trending posts'
    } as any)
  }
}

export const getShoutoutsByWallet = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params

    const shoutouts = await prisma.post.findMany({
      where: {
        authorWallet: walletAddress,
        isShoutout: true,
      },
      select: {
        id: true,
        content: true,
        shoutoutDuration: true,
        shoutoutPrice: true,
        shoutoutTxSignature: true,
        shoutoutExpiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    res.json({
      success: true,
      shoutouts: shoutouts.map(s => ({
        id: s.id,
        content: s.content.substring(0, 100),
        duration: s.shoutoutDuration,
        price: s.shoutoutPrice ? Number(s.shoutoutPrice) : 0,
        txSignature: s.shoutoutTxSignature,
        expiresAt: s.shoutoutExpiresAt,
        createdAt: s.createdAt,
        status: !s.shoutoutExpiresAt ? 'queued'
          : new Date(s.shoutoutExpiresAt) > new Date() ? 'active'
          : 'expired',
      })),
    })
  } catch (error) {
    logger.error('Get shoutouts by wallet error:', error)
    res.status(500).json({ success: false, error: 'Failed to get shoutouts' })
  }
}