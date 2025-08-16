import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../config/database'
import { verifyWalletSignature, checkGenesisTokenOwnership } from '../utils/solana'
import { AuthRequest } from '../middleware/auth'
import { isMockMode, mockAuthController } from '../middleware/mockMode'


const isDebug = () => process.env.DEBUG_MODE === 'true' || (process.env.NODE_ENV === 'development' && process.env.DEBUG_MODE !== 'false')

export const connectWallet = async (req: Request, res: Response) => {
  if (isDebug()) console.log('connectWallet function called')
  
  // Use mock mode if database is not available
  if (isMockMode()) {
    if (isDebug()) console.log('Using mock mode')
    return mockAuthController.connectWallet(req, res)
  }
  
  if (isDebug()) console.log('Using real authentication')
  
  try {
    const { walletAddress, signature, message } = req.body
    
    if (isDebug()) console.log('Connect wallet request:', {
      walletAddress,
      signatureLength: signature?.length,
      message,
      messageType: typeof message
    })

    // Validate input
    if (!walletAddress || !signature || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: walletAddress, signature, message' 
      })
    }

    // Verify signature
    if (isDebug()) {
      console.log('=== WALLET CONNECTION ATTEMPT ===')
      console.log('Wallet address:', walletAddress)
      console.log('Timestamp:', new Date().toISOString())
    }
    
    // Verify the signature
    if (isDebug()) console.log('About to verify signature...')
    let isValid = false
    try {
      isValid = await verifyWalletSignature(walletAddress, signature, message)
      if (isDebug()) console.log('Signature verification completed, result:', isValid)
    } catch (verifyError: any) {
      console.error('Signature verification threw error:', verifyError)
      console.error('Error stack:', verifyError?.stack)
      // Continue anyway for debugging
    }
    
    // Check if auth bypass is allowed via environment variable
    const ALLOW_AUTH_BYPASS = process.env.ALLOW_AUTH_BYPASS === 'true'
    
    // TEMPORARY: For hackathon, allow bypass if signature verification fails
    // This is because MWA and backend might encode signatures differently
    if (!isValid) {
      if (ALLOW_AUTH_BYPASS) {
        console.error('🚨 CRITICAL SECURITY WARNING: Authentication bypass is ACTIVE!')
        console.error('🚨 Signature verification FAILED but allowing access anyway')
        console.error('🚨 This MUST be disabled in production!')
        console.warn('⚠️ Auth bypass enabled via ALLOW_AUTH_BYPASS=true')
        console.log('Wallet:', walletAddress)
      } else {
        console.error('❌ Authentication failed: Invalid signature')
        console.error('To enable bypass for development, set ALLOW_AUTH_BYPASS=true')
        return res.status(401).json({ error: 'Invalid signature' })
      }
    }
    
    // For hackathon: Skip message validation since we're using a simple nonce
    // In production, we'd store nonces and check for replay attacks
    if (isDebug()) console.log('Message received:', message)

    // Check if user exists, create if not
    let user
    try {
      if (isDebug()) console.log('Checking if user exists in database...')
      user = await prisma.user.findUnique({
        where: { walletAddress }
      })
      if (isDebug()) console.log('User lookup result:', user ? 'USER FOUND' : 'USER NOT FOUND')
      if (user && isDebug()) {
        console.log('Existing user details:', {
          wallet: user.walletAddress,
          tier: user.tier,
          createdAt: user.createdAt
        })
      }
    } catch (findError: any) {
      console.error('DATABASE FIND ERROR:', findError)
      console.error('Error details:', {
        message: findError?.message,
        code: findError?.code,
        meta: findError?.meta
      })
      
      // If database connection fails, try to recover
      if (findError?.code === 'P2021' || findError?.message?.includes('connection')) {
        if (isDebug()) console.log('Database connection issue detected, attempting to reconnect...')
        // Give database a moment to recover
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Retry once
        try {
          user = await prisma.user.findUnique({
            where: { walletAddress }
          })
          if (isDebug()) console.log('Retry successful')
        } catch (retryError) {
          console.error('Retry failed:', retryError)
          throw new Error(`Database connection failed: ${findError?.message || String(findError)}`)
        }
      } else {
        throw new Error(`Database find failed: ${findError?.message || String(findError)}`)
      }
    }

    if (!user) {
      try {
        if (isDebug()) console.log('Creating new user...')
        
        // Check for Genesis Token ownership
        const hasGenesisToken = await checkGenesisTokenOwnership(walletAddress)
        if (isDebug()) console.log('Genesis Token check:', hasGenesisToken ? 'VERIFIED' : 'NOT FOUND')
        
        const userData = {
          walletAddress,
          tier: hasGenesisToken ? 'premium' : 'standard',
          walletSource: hasGenesisToken ? 'seeker' : 'app',
          genesisVerified: hasGenesisToken,
          allyBalance: 5000, // Start with 5000 ALLY for testing
          totalInteractionScore: 0
        }
        
        if (isDebug()) console.log('User data to create:', userData)
        
        user = await prisma.user.create({
          data: userData
        })

        if (isDebug()) {
          console.log('=== NEW USER CREATED SUCCESSFULLY ===')
          console.log('User details:', {
            wallet: user.walletAddress,
            tier: user.tier,
            balance: user.allyBalance.toString(),
            createdAt: user.createdAt
          })
        }
      } catch (createError: any) {
        console.error('DATABASE CREATE ERROR:', createError)
        console.error('Error details:', {
          message: createError?.message,
          code: createError?.code,
          meta: createError?.meta,
          stack: createError?.stack
        })
        
        // Check if it's a unique constraint violation (user already exists)
        if (createError?.code === 'P2002') {
          if (isDebug()) console.log('User already exists, attempting to fetch again...')
          try {
            user = await prisma.user.findUnique({
              where: { walletAddress }
            })
            if (user) {
              if (isDebug()) console.log('Found existing user on second attempt')
            } else {
              throw new Error('User exists but cannot be fetched')
            }
          } catch (fetchError) {
            console.error('Failed to fetch existing user:', fetchError)
            throw createError
          }
        } else {
          throw new Error(`Database create failed: ${createError?.message || String(createError)}`)
        }
      }
    }

    // Make sure we have a user object
    if (!user) {
      console.error('CRITICAL: No user object after creation/lookup')
      throw new Error('User creation/lookup failed')
    }

    // Generate JWT
    if (isDebug()) console.log('Generating JWT token...')
    const jwtSecret = process.env.JWT_SECRET
    
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET not configured!')
      console.error('Please set JWT_SECRET in your .env file')
      
      // Only allow fallback in development mode
      if (process.env.NODE_ENV === 'development') {
        const fallbackSecret = 'dev-secret-key-CHANGE-THIS'
        console.warn('⚠️ Using fallback JWT secret for development only')
        const token = jwt.sign(
          { walletAddress },
          fallbackSecret,
          { expiresIn: '7d' }
        )
        if (isDebug()) console.log('JWT token generated with development fallback')
        
        // Continue with the response but warn in the response
        const responseData = {
          success: true,
          token,
          user: {
            walletAddress: user.walletAddress,
            tier: user.tier || 'standard',
            genesisVerified: user.genesisVerified || false,
            allyBalance: user.allyBalance ? user.allyBalance.toString() : '5000',
            createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString()
          },
          expiresIn: '7d',
          warning: 'JWT_SECRET not configured - using development fallback'
        }
        
        if (isDebug()) {
          console.log('=== AUTHENTICATION SUCCESSFUL (DEV MODE) ===')
          console.log('Sending response with warning')
        }
        return res.json(responseData)
      } else {
        // In production, fail if JWT_SECRET is not set
        return res.status(500).json({ 
          error: 'Server configuration error',
          details: 'JWT_SECRET not configured'
        })
      }
    }
    
    if (isDebug()) console.log('JWT_SECRET is set from environment')
    
    const token = jwt.sign(
      { walletAddress },
      jwtSecret,
      { expiresIn: '7d' }
    )

    if (isDebug()) console.log('JWT token generated successfully')
    
    // Prepare response data
    const responseData = {
      success: true,
      token,
      user: {
        walletAddress: user.walletAddress,
        tier: user.tier || 'standard',
        genesisVerified: user.genesisVerified || false,
        allyBalance: user.allyBalance ? user.allyBalance.toString() : '5000',
        createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString()
      },
      expiresIn: '7d'
    }
    
    if (isDebug()) {
      console.log('=== AUTHENTICATION SUCCESSFUL ===')
      console.log('Sending response:', JSON.stringify(responseData, null, 2))
    }

    res.json(responseData)
  } catch (error: any) {
    console.error('=== CONNECT WALLET ERROR ===')
    console.error('Error:', error)
    console.error('Stack:', error?.stack)
    
    // Send more detailed error for debugging
    res.status(500).json({ 
      error: 'Failed to connect wallet',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    })
  }
}

export const getProfile = async (req: AuthRequest, res: Response) => {
  // Use mock mode if database is not available
  if (isMockMode()) {
    return mockAuthController.getProfile(req, res)
  }
  
  try {
    const walletAddress = req.userWallet!
    
    if (isDebug()) console.log('Getting profile for:', walletAddress)

    const user = await prisma.user.findUnique({
      where: { walletAddress }
    })

    if (!user) {
      console.error('User not found in database:', walletAddress)
      return res.status(404).json({ error: 'User not found' })
    }

    if (isDebug()) {
      console.log('Profile found:', {
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
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ error: 'Failed to get profile' })
  }
}
