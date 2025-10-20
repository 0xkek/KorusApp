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

    // Check if post exists
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // Can't repost your own post
    if (post.authorWallet === walletAddress) {
      return res.status(400).json({ error: 'Cannot repost your own post' })
    }

    // Toggle repost (if already reposted, unrepost it)
    const existingRepost = await prisma.repost.findUnique({
      where: {
        userWallet_postId: {
          userWallet: walletAddress,
          postId: id
        }
      }
    })

    if (existingRepost) {
      // Unrepost - delete the repost post entity and the repost record
      // Find the repost post
      const repostPost = await prisma.post.findFirst({
        where: {
          authorWallet: walletAddress,
          isRepost: true,
          originalPostId: id
        }
      })

      if (repostPost) {
        // Delete the repost post
        await prisma.post.delete({
          where: { id: repostPost.id }
        })
      }

      // Delete the repost record
      await prisma.repost.delete({
        where: { id: existingRepost.id }
      })

      // Decrement original post's repost count
      await prisma.post.update({
        where: { id },
        data: { repostCount: { decrement: 1 } }
      })

      res.json({ success: true, reposted: false, message: 'Post unreposted' })
    } else {
      // Create a new Post entity for the repost (so it can have its own interactions)
      const repostPost = await prisma.post.create({
        data: {
          authorWallet: walletAddress,
          content: comment || '', // Optional comment on the repost
          isRepost: true,
          originalPostId: id
        },
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

      // Create repost record linking user to original post
      await prisma.repost.create({
        data: {
          userWallet: walletAddress,
          postId: id
        }
      })

      // Increment original post's repost count
      await prisma.post.update({
        where: { id },
        data: { repostCount: { increment: 1 } }
      })

      // Award reputation points
      await reputationService.onRepostGiven(walletAddress)
      await reputationService.onRepostReceived(post.authorWallet)

      // Create notification
      await createNotification({
        userId: post.authorWallet,
        type: 'repost',
        fromUserId: walletAddress,
        postId: id
      })

      // Transform NFT avatar mint addresses to image URLs
      const transformedPost = await transformPostAvatars(repostPost)

      // Emit new repost to all connected WebSocket clients
      emitNewPost(transformedPost)

      res.json({
        success: true,
        reposted: true,
        message: 'Post reposted',
        repostPost: transformedPost // Return the full repost post with original post data
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
