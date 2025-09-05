import { Request, Response } from 'express'
import prisma from '../config/database'
import { SNS_CONFIG } from '../config/constants'
import { asyncHandler } from '../middleware/errorHandler'
import { AppError } from '../utils/AppError'
import { logger } from '../utils/logger'
// ApiResponse type
interface ApiResponse {
  success: boolean
  error?: string
  posts?: any[]
  users?: any[]
  totalPosts?: number
  hasMore?: boolean
}

// Use SNS domain mapping from config
const SNS_DOMAINS = SNS_CONFIG.DEMO_DOMAINS

// Default domain for wallets not in the mapping
const DEFAULT_DOMAIN = SNS_CONFIG.DEFAULT_DOMAIN || 'anonymous.sol'

function getWalletDomain(wallet: string): string {
  return SNS_DOMAINS[wallet] || DEFAULT_DOMAIN
}

export const searchPosts = asyncHandler(async (req: Request, res: Response) => {
    const { query, limit = 20, offset = 0 } = req.query
    
    logger.debug('[SEARCH] Received search request:', { query, limit, offset })
    
    // If no query, return all posts
    if (!query || typeof query !== 'string' || !query.trim()) {
      const allPosts = await prisma.post.findMany({
        include: {
          author: {
            select: {
              walletAddress: true,
              tier: true,
              genesisVerified: true
            }
          },
          replies: {
            include: {
              author: {
                select: {
                  walletAddress: true,
                  tier: true,
                  genesisVerified: true
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: Number(limit),
        skip: Number(offset)
      })
      
      const transformedPosts = allPosts.map(post => ({
        ...post,
        author: {
          ...post.author,
          snsDomain: getWalletDomain(post.author.walletAddress)
        },
        replies: post.replies.map(reply => ({
          ...reply,
          author: {
            ...reply.author,
            snsDomain: getWalletDomain(reply.author.walletAddress)
          }
        }))
      }))
      
      return res.json({
        success: true,
        posts: transformedPosts,
        users: [],
        totalPosts: allPosts.length,
        hasMore: allPosts.length === Number(limit)
      })
    }

    const searchQuery = query.toLowerCase().trim()
    logger.debug('[SEARCH] Searching for:', searchQuery)
    
    // First, find wallets that match the SNS domain search
    const matchingWallets: string[] = []
    
    // Check if the query matches any SNS domains
    for (const [wallet, domain] of Object.entries(SNS_DOMAINS)) {
      if (typeof domain === 'string' && domain.toLowerCase().includes(searchQuery)) {
        logger.debug('[SEARCH] Found SNS match: ' + domain + ' for wallet: ' + wallet)
        matchingWallets.push(wallet)
      }
    }
    
    // Also check if searching for default domain
    if (DEFAULT_DOMAIN.toLowerCase().includes(searchQuery)) {
      logger.debug('[SEARCH] Query matches default domain:', DEFAULT_DOMAIN)
      // Get all wallets not in SNS_DOMAINS
      const allUsers = await prisma.user.findMany({
        select: { walletAddress: true }
      })
      
      logger.debug('[SEARCH] Found ' + allUsers.length + ' total users')
      
      allUsers.forEach(user => {
        if (!SNS_DOMAINS[user.walletAddress]) {
          matchingWallets.push(user.walletAddress)
        }
      })
      
      logger.debug('[SEARCH] Added ' + matchingWallets.length + ' wallets with default domain')
    }

    // Search posts by content, wallet address, or matching SNS wallets
    const posts = await prisma.post.findMany({
      where: {
        OR: [
          // Search in post content
          {
            content: {
              contains: searchQuery,
              mode: 'insensitive'
            }
          },
          // Search by wallet address (partial match)
          {
            authorWallet: {
              contains: searchQuery,
              mode: 'insensitive'
            }
          },
          // Search by SNS domain matches
          {
            authorWallet: {
              in: matchingWallets
            }
          },
          // Search in topic
          {
            topic: {
              contains: searchQuery,
              mode: 'insensitive'
            }
          }
        ]
      },
      include: {
        author: {
          select: {
            walletAddress: true,
            tier: true,
            genesisVerified: true
          }
        },
        replies: {
          include: {
            author: {
              select: {
                walletAddress: true,
                tier: true,
                genesisVerified: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: Number(limit),
      skip: Number(offset)
    })
    
    logger.debug('[SEARCH] Found ' + posts.length + ' posts matching query')

    // Also search for users by wallet or SNS domain
    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            walletAddress: {
              contains: searchQuery,
              mode: 'insensitive'
            }
          },
          {
            walletAddress: {
              in: matchingWallets
            }
          }
        ]
      },
      take: 10 // Limit user results
    })

    // Transform results to include SNS domains
    const transformedPosts = posts.map(post => ({
      ...post,
      author: {
        ...post.author,
        snsDomain: getWalletDomain(post.author.walletAddress)
      },
      replies: post.replies.map(reply => ({
        ...reply,
        author: {
          ...reply.author,
          snsDomain: getWalletDomain(reply.author.walletAddress)
        }
      }))
    }))

    const transformedUsers = users.map(user => ({
      ...user,
      snsDomain: getWalletDomain(user.walletAddress)
    }))

    res.json({
      success: true,
      posts: transformedPosts,
      users: transformedUsers,
      totalPosts: posts.length,
      hasMore: posts.length === Number(limit)
    })
})

// Search users specifically
export const searchUsers = asyncHandler(async (req: Request, res: Response) => {
    const { query, limit = 10 } = req.query
    
    if (!query || typeof query !== 'string') {
      throw new AppError('Search query is required', 400, 'MISSING_QUERY')
    }

    const searchQuery = query.toLowerCase().trim()
    
    // Find wallets that match the SNS domain search
    const matchingWallets: string[] = []
    
    for (const [wallet, domain] of Object.entries(SNS_DOMAINS)) {
      if (typeof domain === 'string' && domain.toLowerCase().includes(searchQuery)) {
        matchingWallets.push(wallet)
      }
    }
    
    // Search for default domain
    if (DEFAULT_DOMAIN.includes(searchQuery)) {
      const allUsers = await prisma.user.findMany({
        select: { walletAddress: true }
      })
      
      allUsers.forEach(user => {
        if (!SNS_DOMAINS[user.walletAddress]) {
          matchingWallets.push(user.walletAddress)
        }
      })
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            walletAddress: {
              contains: searchQuery,
              mode: 'insensitive'
            }
          },
          {
            walletAddress: {
              in: matchingWallets
            }
          }
        ]
      },
      include: {
        _count: {
          select: {
            posts: true,
            replies: true
          }
        }
      },
      take: Number(limit)
    })

    const transformedUsers = users.map(user => ({
      ...user,
      snsDomain: getWalletDomain(user.walletAddress),
      postCount: user._count.posts,
      replyCount: user._count.replies
    }))

    res.json({
      success: true,
      users: transformedUsers
    })
})