import { logger } from '../utils/logger'
import { Response } from 'express'
import prisma from '../config/database'
import { AuthRequest } from '../middleware/auth'
import { reputationService } from '../services/reputationService'
import { createNotification } from '../utils/notifications'
import { getNFTByMint } from '../services/nftService'
import { emitNewPost } from '../config/socket'

// Helper function to resolve NFT avatar mints to image URLs
async function resolveNFTAvatar(nftMint: string | null): Promise<string | null> {
  if (!nftMint) return null
  try {
    const nft = await getNFTByMint(nftMint)
    return nft?.image || null
  } catch (error) {
    logger.error(`Failed to resolve NFT avatar ${nftMint}:`, error)
    return null
  }
}

// Transform post author avatars from mint addresses to image URLs
async function transformPostAvatars(post: any): Promise<any> {
  if (post.author?.nftAvatar) {
    post.author.nftAvatar = await resolveNFTAvatar(post.author.nftAvatar)
  }
  if (post.originalPost?.author?.nftAvatar) {
    post.originalPost.author.nftAvatar = await resolveNFTAvatar(post.originalPost.author.nftAvatar)
  }
  return post
}

export const repostPost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const walletAddress = req.userWallet!
    const { comment } = req.body // Optional comment on the repost

    logger.debug('Repost request received:', {
      id,
      walletAddress,
      hasComment: !!comment
    })

    // Try to find as post first, then as reply
    let post = await prisma.post.findUnique({ where: { id } })
    let reply = null
    let isReplyRepost = false
    let authorWallet = ''
    let originalPostId = id // Default to the post ID

    if (!post) {
      // Check if it's a reply
      reply = await prisma.reply.findUnique({
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
          post: true // Include the parent post
        }
      })

      if (!reply) {
        return res.status(404).json({ error: 'Post or reply not found' })
      }

      isReplyRepost = true
      authorWallet = reply.authorWallet
      originalPostId = reply.id // For replies, we store the reply ID as originalPostId
    } else {
      authorWallet = post.authorWallet
    }

    // Can't repost your own post/reply
    if (authorWallet === walletAddress) {
      return res.status(400).json({ error: 'Cannot repost your own post or reply' })
    }

    // Toggle repost (if already reposted, unrepost it)
    // For post reposts: Check Repost table
    // For reply reposts: Check for a repost Post (since we don't create Repost records for replies)
    let existingRepost = null
    let hasExistingRepost = false

    if (!isReplyRepost) {
      // For post reposts, check the Repost table
      existingRepost = await prisma.repost.findUnique({
        where: {
          userWallet_postId: {
            userWallet: walletAddress,
            postId: originalPostId
          }
        }
      })
      hasExistingRepost = !!existingRepost
    } else {
      // For reply reposts, check if there's a repost Post
      // We can't use originalPostId since it's null for reply reposts
      // So we search for a repost Post by this user with matching content
      const repostPosts = await prisma.post.findMany({
        where: {
          authorWallet: walletAddress,
          isRepost: true,
          originalPostId: null // Reply reposts have null originalPostId
        }
      })
      // Check if any of these reposts match the reply content
      hasExistingRepost = repostPosts.some(rp => rp.content === (reply?.content || ''))
    }

    if (hasExistingRepost) {
      // Unrepost - delete the repost post entity and (for posts) the repost record
      // Find the repost post
      const repostPost = await prisma.post.findFirst({
        where: {
          authorWallet: walletAddress,
          isRepost: true,
          originalPostId: isReplyRepost ? null : originalPostId
        }
      })

      if (repostPost) {
        // Delete the repost post
        await prisma.post.delete({
          where: { id: repostPost.id }
        })
      }

      // Delete the repost record (only exists for post reposts)
      if (!isReplyRepost && existingRepost) {
        await prisma.repost.delete({
          where: { id: existingRepost.id }
        })
      }

      // Decrement repost count on the original content
      if (isReplyRepost && reply) {
        // Decrement original reply's repost count
        await prisma.reply.update({
          where: { id },
          data: { repostCount: { decrement: 1 } }
        })
      } else if (post) {
        // Decrement original post's repost count
        await prisma.post.update({
          where: { id },
          data: { repostCount: { decrement: 1 } }
        })
      }

      res.json({ success: true, reposted: false, message: isReplyRepost ? 'Reply unreposted' : 'Post unreposted' })
    } else {
      // Create a new Post entity for the repost (so it can have its own interactions)
      // For replies, we don't use originalPostId (since it's a FK to posts table)
      // Instead, we store the reply content and use the Repost table to track the reply ID
      const repostPost = await prisma.post.create({
        data: {
          authorWallet: walletAddress,
          content: comment || (isReplyRepost && reply ? reply.content : ''), // Use reply content if reposting a reply
          isRepost: true,
          originalPostId: isReplyRepost ? null : originalPostId // Only set for post reposts, not reply reposts
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
              themeColor: true,
              subscriptionStatus: true,
              subscriptionType: true
            }
          }
        }
      })

      // Create repost record linking user to original post
      // Note: Only create Repost record for post reposts, not reply reposts
      // (because Repost.postId has FK constraint to Post table)
      if (!isReplyRepost) {
        await prisma.repost.create({
          data: {
            userWallet: walletAddress,
            postId: originalPostId
          }
        })
      }

      // Increment repost count on the original content
      if (isReplyRepost && reply) {
        // Increment original reply's repost count
        await prisma.reply.update({
          where: { id },
          data: { repostCount: { increment: 1 } }
        })
      } else if (post) {
        // Increment original post's repost count
        await prisma.post.update({
          where: { id },
          data: { repostCount: { increment: 1 } }
        })
      }

      // Award reputation points
      await reputationService.onRepostGiven(walletAddress)
      await reputationService.onRepostReceived(authorWallet)

      // Create notification
      await createNotification({
        userId: authorWallet,
        type: 'repost',
        fromUserId: walletAddress,
        postId: originalPostId
      })

      // For reply reposts, we need to manually construct the response with the original reply data
      let responseData: any
      if (isReplyRepost && reply) {
        // Manually add the original reply data to the response
        responseData = {
          ...repostPost,
          originalReply: {
            id: reply.id,
            content: reply.content,
            authorWallet: reply.authorWallet,
            createdAt: reply.createdAt,
            likeCount: reply.likeCount,
            tipCount: reply.tipCount,
            imageUrl: reply.imageUrl,
            videoUrl: reply.videoUrl,
            author: reply.author,
            postId: reply.postId // Include parent post ID for context
          }
        }
      } else {
        // For post reposts, fetch with the originalPost relation
        const repostWithOriginal = await prisma.post.findUnique({
          where: { id: repostPost.id },
          include: {
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
                    themeColor: true,
                    subscriptionStatus: true,
                    subscriptionType: true
                  }
                }
              }
            },
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
        })
        responseData = repostWithOriginal
      }

      // Transform NFT avatar mint addresses to image URLs
      const transformedPost = await transformPostAvatars(responseData)

      // Emit new repost to all connected WebSocket clients
      emitNewPost(transformedPost)

      res.json({
        success: true,
        reposted: true,
        message: isReplyRepost ? 'Reply reposted' : 'Post reposted',
        repostPost: transformedPost, // Return the full repost post with original post/reply data
        isReplyRepost // Flag to indicate this is a reply repost
      })
    }
  } catch (error: any) {
    logger.error('Repost post error:', error)
    logger.error('Error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta
    })

    // Check for specific Prisma errors
    if (error?.code === 'P2003') {
      res.status(400).json({ error: 'User not found. Please reconnect your wallet.' })
    } else {
      res.status(500).json({ error: 'Failed to repost post' })
    }
  }
}

export const getUserReposts = async (req: AuthRequest, res: Response) => {
  try {
    const walletAddress = req.userWallet!
    const { postIds } = req.body

    if (!postIds || !Array.isArray(postIds)) {
      return res.status(400).json({ error: 'postIds array is required' })
    }

    // Get all user's reposts for the specified posts
    const reposts = await prisma.repost.findMany({
      where: {
        userWallet: walletAddress,
        postId: {
          in: postIds.map(id => String(id))
        }
      },
      select: {
        postId: true
      }
    })

    // Create a map of postId -> reposted boolean
    const repostMap: Record<string, boolean> = {}

    // Initialize all posts as not reposted
    postIds.forEach(id => {
      repostMap[String(id)] = false
    })

    // Update with actual reposts
    reposts.forEach(repost => {
      repostMap[repost.postId] = true
    })

    res.json({
      success: true,
      reposts: repostMap
    })
  } catch (error) {
    logger.error('Get user reposts error:', error)
    res.status(500).json({ error: 'Failed to get user reposts' })
  }
}
