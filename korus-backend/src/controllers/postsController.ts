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

// Helper function to resolve NFT avatar mints to image URLs
async function resolveNFTAvatar(nftMint: string | null): Promise<string | null> {
  if (!nftMint) return null
  // If it's already a URL, return as-is
  if (nftMint.startsWith('http://') || nftMint.startsWith('https://')) return nftMint
  try {
    const nft = await getNFTByMint(nftMint)
    return nft?.image || nftMint // Fall back to original value if resolution fails
  } catch (error) {
    logger.error(`Failed to resolve NFT avatar ${nftMint}:`, error)
    return nftMint // Preserve original value on error
  }
}

// Transform post author avatars from mint addresses to image URLs
async function transformPostAvatars(post: any): Promise<any> {
  if (post.author?.nftAvatar) {
    post.author.nftAvatar = await resolveNFTAvatar(post.author.nftAvatar)
  }
  // Transform reply authors' avatars
  if (post.replies && Array.isArray(post.replies)) {
    for (const reply of post.replies) {
      if (reply.author?.nftAvatar) {
        reply.author.nftAvatar = await resolveNFTAvatar(reply.author.nftAvatar)
      }
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

    // Validate input - require either content or media
    if (!content && !imageUrl && !videoUrl) {
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

      // Set shoutout fields
      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + shoutoutDuration)
      
      shoutoutData = {
        isShoutout: true,
        shoutoutDuration,
        shoutoutExpiresAt: expiresAt,
        shoutoutPrice: price
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
    // Update reputation for post creation
    const hasMedia = !!(imageUrl || videoUrl);
    await reputationService.onPostCreated(walletAddress, hasMedia)

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
    const { cursor, limit, maxId, sinceId } = req.query

    // First, get active shoutout (only one at a time - the oldest one by creation)
    const now = new Date()
    const activeShoutout = await prisma.post.findFirst({
      where: {
        isHidden: false,
        isShoutout: true,
        shoutoutExpiresAt: {
          gt: now // Greater than current time (not expired)
        }
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
      orderBy: {
        createdAt: 'asc' // Oldest first (FIFO queue)
      }
    })

    // Convert to array for consistency with existing code
    const activeShoutouts = activeShoutout ? [activeShoutout] : []

    // Get queued shoutouts (all other non-expired shoutouts that aren't currently active)
    const queuedShoutouts = await prisma.post.findMany({
      where: {
        isHidden: false,
        isShoutout: true,
        shoutoutExpiresAt: {
          gt: now
        },
        // Exclude the active shoutout from the queue
        ...(activeShoutout ? { id: { not: activeShoutout.id } } : {})
      },
      select: {
        id: true,
        content: true,
        shoutoutDuration: true,
        createdAt: true,
        shoutoutExpiresAt: true
      },
      orderBy: {
        createdAt: 'asc' // FIFO order
      }
    })

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
          game: null // Exclude posts that are linked to games
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
        queued: queuedShoutouts.map(s => ({
          id: s.id,
          duration: s.shoutoutDuration,
          expiresAt: s.shoutoutExpiresAt,
          content: s.content?.substring(0, 50) || '' // First 50 chars for preview
        })),
        queueLength: queuedShoutouts.length
      }
    })
  } catch (error: any) {
    logger.error('Get posts error:', error)
    logger.error('Error stack:', error?.stack)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get posts',
      details: error?.message || 'Unknown error'
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