import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../config/database'
import { verifyWalletSignature, checkGenesisTokenOwnership } from '../utils/solana'
import { AuthRequest } from '../middleware/auth'
import { AppError, ValidationError, AuthenticationError, DatabaseError } from '../utils/AppError'
import { asyncHandler } from '../middleware/errorHandler'
import { TOKEN_CONFIG } from '../config/constants'
import { logger } from '../utils/logger'
import { getNFTByMint } from '../services/nftService'
import { userCache } from '../utils/cache'
// Mock mode removed for production

const USER_PROFILE_TTL = 5 * 60 * 1000 // 5 minutes


const isDebug = () => process.env.DEBUG_MODE === 'true' || (process.env.NODE_ENV === 'development' && process.env.DEBUG_MODE !== 'false')

export const connectWallet = asyncHandler(async (req: Request, res: Response) => {
  logger.debug('connectWallet function called')
  
  // Mock mode removed - production only
  
  logger.debug('Using real authentication')
  
  const { walletAddress, signature, message } = req.body
  
  logger.debug('Connect wallet request:', {
    walletAddress,
    signatureLength: signature?.length,
    message,
    messageType: typeof message
  })

  // Validate input
  if (!walletAddress || !signature || !message) {
    throw new ValidationError('Missing required fields: walletAddress, signature, message')
  }

    // Verify signature
    if (isDebug()) {
      logger.debug('=== WALLET CONNECTION ATTEMPT ===')
      logger.debug('Wallet address:', walletAddress)
      logger.debug('Timestamp:', new Date().toISOString())
    }

    // Validate timestamp to prevent replay attacks
    const timestampMatch = message.match(/Timestamp:\s*(\d+)/);
    if (timestampMatch) {
      const messageTimestamp = parseInt(timestampMatch[1]);
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

      if (isNaN(messageTimestamp)) {
        logger.error('Invalid timestamp format in message');
        throw new AuthenticationError('Invalid message format');
      }

      // Check if message is too old
      if (now - messageTimestamp > fiveMinutes) {
        logger.error('Signature expired:', {
          messageTime: new Date(messageTimestamp).toISOString(),
          currentTime: new Date(now).toISOString(),
          ageMinutes: Math.floor((now - messageTimestamp) / 60000)
        });
        throw new AuthenticationError('Signature expired. Please sign a new message.');
      }

      // Check if message is from the future (clock skew protection)
      if (messageTimestamp > now + 60000) { // Allow 1 minute clock skew
        logger.error('Signature timestamp from future:', {
          messageTime: new Date(messageTimestamp).toISOString(),
          currentTime: new Date(now).toISOString()
        });
        throw new AuthenticationError('Invalid signature timestamp');
      }

      logger.debug('Timestamp validation passed:', {
        age: Math.floor((now - messageTimestamp) / 1000) + ' seconds'
      });
    } else {
      // Reject messages without timestamps to prevent signature replay
      logger.warn('Message rejected: no timestamp present');
      throw new AuthenticationError('Message must contain a timestamp');
    }

    // Verify the signature
    logger.debug('About to verify signature...')
    let isValid = false
    try {
      isValid = await verifyWalletSignature(walletAddress, signature, message)
      logger.debug('Signature verification completed, result:', isValid)
    } catch (verifyError) {
      const error = verifyError as Error
      logger.error('Signature verification error:', error?.message || error)
      logger.error('Error stack:', error?.stack)
      throw new AuthenticationError('Signature verification failed')
    }

    // Check if signature is valid
    if (!isValid) {
      logger.error('Authentication failed: Invalid signature for wallet:', walletAddress)
      throw new AuthenticationError('Invalid signature')
    }
    
    // Signature verified successfully
    if (isDebug()) {
      logger.debug('✅ Signature verified successfully for:', walletAddress)
      logger.debug('Message received:', message)
    }

    // Check if user exists, create if not
    let user
    try {
      logger.debug('Checking if user exists in database...')
      user = await prisma.user.findUnique({
        where: { walletAddress }
      })
      logger.debug('User lookup result:', user ? 'USER FOUND' : 'USER NOT FOUND')
      if (user && isDebug()) {
        logger.debug('Existing user details:', {
          wallet: user.walletAddress,
          tier: user.tier,
          createdAt: user.createdAt
        })
      }
    } catch (findError) {
      const error = findError as any
      logger.error('DATABASE FIND ERROR:', error)
      logger.error('Error details:', {
        message: error?.message,
        code: error?.code,
        meta: error?.meta
      })
      
      // If database connection fails, try to recover
      if (error?.code === 'P2021' || error?.message?.includes('connection')) {
        logger.debug('Database connection issue detected, attempting to reconnect...')
        // Give database a moment to recover
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Retry once
        try {
          user = await prisma.user.findUnique({
            where: { walletAddress }
          })
          logger.debug('Retry successful')
        } catch (retryError) {
          logger.error('Retry failed:', retryError)
          throw new DatabaseError(`Database connection failed: ${error?.message || String(error)}`)
        }
      } else {
        throw new DatabaseError(`Database find failed: ${error?.message || String(error)}`)
      }
    }

    if (!user) {
      try {
        logger.debug('Creating new user...')
        
        // Check for Genesis Token ownership
        const hasGenesisToken = await checkGenesisTokenOwnership(walletAddress)
        logger.debug('Genesis Token check:', hasGenesisToken ? 'VERIFIED' : 'NOT FOUND')
        
        const userData = {
          walletAddress,
          tier: hasGenesisToken ? 'premium' : 'standard',
          walletSource: hasGenesisToken ? 'seeker' : 'app',
          genesisVerified: hasGenesisToken,
          solBalance: TOKEN_CONFIG.INITIAL_SOL_BALANCE,
          totalInteractionScore: 0,
          themeColor: '#43E97B' // Default green theme color
        }
        
        logger.debug('User data to create:', userData)
        
        user = await prisma.user.create({
          data: userData
        })

        if (isDebug()) {
          logger.debug('=== NEW USER CREATED SUCCESSFULLY ===')
          logger.debug('User details:', {
            wallet: user.walletAddress,
            tier: user.tier,
            balance: user.solBalance.toString(),
            createdAt: user.createdAt
          })
        }
      } catch (createError) {
        const error = createError as any
        logger.error('DATABASE CREATE ERROR:', error)
        logger.error('Error details:', {
          message: error?.message,
          code: error?.code,
          meta: error?.meta,
          stack: error?.stack
        })
        
        // Check if it's a unique constraint violation (user already exists)
        if (error?.code === 'P2002') {
          logger.debug('User already exists, attempting to fetch again...')
          try {
            user = await prisma.user.findUnique({
              where: { walletAddress }
            })
            if (user) {
              logger.debug('Found existing user on second attempt')
            } else {
              throw new DatabaseError('User exists but cannot be fetched')
            }
          } catch (fetchError) {
            logger.error('Failed to fetch existing user:', fetchError)
            throw error
          }
        } else {
          throw new DatabaseError(`Database create failed: ${error?.message || String(error)}`)
        }
      }
    }

    // Make sure we have a user object
    if (!user) {
      logger.error('CRITICAL: No user object after creation/lookup')
      throw new DatabaseError('User creation/lookup failed')
    }

    // Generate JWT
    logger.debug('Generating JWT token...')
    const jwtSecret = process.env.JWT_SECRET
    
    if (!jwtSecret) {
      logger.error('❌ JWT_SECRET not configured!')
      logger.error('JWT_SECRET is not configured - this is required for production')
      
      // Production mode - always fail if JWT_SECRET is not set
      throw new AppError('Server configuration error: JWT_SECRET not configured', 500, 'CONFIG_ERROR')
    }
    
    logger.debug('JWT_SECRET is set from environment')
    
    const token = jwt.sign(
      { walletAddress },
      jwtSecret,
      { expiresIn: '7d' }
    )

    logger.debug('JWT token generated successfully')
    
    // Prepare response data
    const responseData = {
      success: true,
      token,
      user: {
        walletAddress: user.walletAddress,
        tier: user.tier || 'standard',
        genesisVerified: user.genesisVerified || false,
        solBalance: user.solBalance ? user.solBalance.toString() : TOKEN_CONFIG.INITIAL_SOL_BALANCE.toString(),
        createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString()
      },
      expiresIn: '7d'
    }
    
    if (isDebug()) {
      logger.debug('=== AUTHENTICATION SUCCESSFUL ===')
      logger.debug('Sending response:', JSON.stringify(responseData, null, 2))
    }

    res.json(responseData)
})

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Mock mode removed - production only

  const walletAddress = req.userWallet!

  logger.debug('Getting profile for:', walletAddress)

  // Check cache first
  const profileCacheKey = `user-profile:${walletAddress}`
  const cachedProfile = await userCache.get<any>(profileCacheKey)
  if (cachedProfile) {
    logger.debug('Profile cache hit for:', walletAddress)
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    return res.json({ user: cachedProfile })
  }

  const user = await prisma.user.findUnique({
    where: { walletAddress }
  })

  if (!user) {
    logger.error('User not found in database:', walletAddress)
    throw new AppError('User not found', 404, 'USER_NOT_FOUND')
  }

  if (isDebug()) {
    logger.debug('Profile found:', {
      wallet: user.walletAddress,
      tier: user.tier,
      balance: user.solBalance.toString()
    })
  }

  // Transform NFT avatar mint address to image URL
  let nftAvatarUrl = user.nftAvatar
  logger.debug('Original nftAvatar from DB:', user.nftAvatar)
  if (user.nftAvatar) {
    try {
      const nft = await getNFTByMint(user.nftAvatar)
      nftAvatarUrl = nft?.image || user.nftAvatar
      logger.debug('Transformed nftAvatarUrl:', nftAvatarUrl)
    } catch (error) {
      logger.error(`Failed to resolve NFT avatar ${user.nftAvatar}:`, error)
    }
  }

  const profileData = {
    ...user,
    solBalance: user.solBalance.toString(),
    nftAvatar: nftAvatarUrl
  }

  // Cache the profile
  await userCache.set(profileCacheKey, profileData, USER_PROFILE_TTL)

  // Prevent browser caching to ensure fresh avatar data
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

  logger.debug('Sending profile response with nftAvatar:', nftAvatarUrl)

  res.json({ user: profileData })
})

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const walletAddress = req.userWallet!
  const { snsUsername, nftAvatar, displayName, bio, location, website, twitter, themeColor } = req.body

  // Validate field lengths to prevent abuse
  if (displayName && typeof displayName === 'string' && displayName.length > 50) {
    return res.status(400).json({ error: 'Display name must be 50 characters or less' })
  }
  if (bio && typeof bio === 'string' && bio.length > 300) {
    return res.status(400).json({ error: 'Bio must be 300 characters or less' })
  }
  if (location && typeof location === 'string' && location.length > 100) {
    return res.status(400).json({ error: 'Location must be 100 characters or less' })
  }
  if (website && typeof website === 'string' && website.length > 200) {
    return res.status(400).json({ error: 'Website URL must be 200 characters or less' })
  }
  if (twitter && typeof twitter === 'string' && twitter.length > 50) {
    return res.status(400).json({ error: 'Twitter handle must be 50 characters or less' })
  }
  if (snsUsername && typeof snsUsername === 'string' && snsUsername.length > 50) {
    return res.status(400).json({ error: 'SNS username must be 50 characters or less' })
  }
  if (themeColor && typeof themeColor === 'string' && !/^#[0-9a-fA-F]{6}$/.test(themeColor)) {
    return res.status(400).json({ error: 'Theme color must be a valid hex color (e.g. #FF5500)' })
  }

  logger.debug('Updating profile for: ' + walletAddress)

  const updatedUser = await prisma.user.update({
    where: { walletAddress },
    data: {
      ...(snsUsername !== undefined && { snsUsername: typeof snsUsername === 'string' ? snsUsername.slice(0, 50) : snsUsername }),
      ...(nftAvatar !== undefined && { nftAvatar }),
      ...(displayName !== undefined && { displayName: typeof displayName === 'string' ? displayName.slice(0, 50) : displayName }),
      ...(bio !== undefined && { bio: typeof bio === 'string' ? bio.slice(0, 300) : bio }),
      ...(location !== undefined && { location: typeof location === 'string' ? location.slice(0, 100) : location }),
      ...(website !== undefined && { website: typeof website === 'string' ? website.slice(0, 200) : website }),
      ...(twitter !== undefined && { twitter: typeof twitter === 'string' ? twitter.slice(0, 50) : twitter }),
      ...(themeColor !== undefined && { themeColor })
    }
  })

  // Invalidate cached profile
  await userCache.delete(`user-profile:${walletAddress}`)

  if (isDebug()) {
    logger.debug('Profile updated:', {
      wallet: updatedUser.walletAddress,
      snsUsername: updatedUser.snsUsername,
      nftAvatar: updatedUser.nftAvatar
    })
  }

  res.json({
    success: true,
    user: {
      ...updatedUser,
      solBalance: updatedUser.solBalance.toString()
    }
  })
})
