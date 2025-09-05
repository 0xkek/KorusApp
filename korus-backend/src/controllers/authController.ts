import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../config/database'
import { verifyWalletSignature, checkGenesisTokenOwnership } from '../utils/solana'
import { AuthRequest } from '../middleware/auth'
import { AppError, ValidationError, AuthenticationError, DatabaseError } from '../utils/AppError'
import { asyncHandler } from '../middleware/errorHandler'
import { TOKEN_CONFIG } from '../config/constants'
import { logger } from '../utils/logger'
// Mock mode removed for production


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
          allyBalance: TOKEN_CONFIG.INITIAL_ALLY_BALANCE,
          totalInteractionScore: 0
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
            balance: user.allyBalance.toString(),
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
        allyBalance: user.allyBalance ? user.allyBalance.toString() : TOKEN_CONFIG.INITIAL_ALLY_BALANCE.toString(),
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
      balance: user.allyBalance.toString()
    })
  }

  res.json({
    user: {
      ...user,
      allyBalance: user.allyBalance.toString()
    }
  })
})

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Mock mode removed - production only
  
  const walletAddress = req.userWallet!
  const { snsUsername, nftAvatar, displayName, bio, location, website, twitter, themeColor } = req.body
  
  logger.debug('Updating profile for: ' + walletAddress, req.body)

  const updatedUser = await prisma.user.update({
    where: { walletAddress },
    data: {
      ...(snsUsername !== undefined && { snsUsername }),
      ...(nftAvatar !== undefined && { nftAvatar }),
      ...(displayName !== undefined && { displayName }),
      ...(bio !== undefined && { bio }),
      ...(location !== undefined && { location }),
      ...(website !== undefined && { website }),
      ...(twitter !== undefined && { twitter }),
      ...(themeColor !== undefined && { themeColor })
    }
  })

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
      allyBalance: updatedUser.allyBalance.toString()
    }
  })
})
