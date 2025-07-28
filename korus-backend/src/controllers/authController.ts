import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../config/database'
import { verifyWalletSignature, checkGenesisTokenOwnership } from '../utils/solana'
import { AuthRequest } from '../middleware/auth'
import { isMockMode, mockAuthController } from '../middleware/mockMode'

export const connectWallet = async (req: Request, res: Response) => {
  // Use mock mode if database is not available
  if (isMockMode()) {
    return mockAuthController.connectWallet(req, res)
  }
  
  try {
    const { walletAddress, signature, message } = req.body

    // Validate input
    if (!walletAddress || !signature || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: walletAddress, signature, message' 
      })
    }

    // Verify signature
    console.log('=== WALLET CONNECTION ATTEMPT ===')
    console.log('Wallet address:', walletAddress)
    console.log('Timestamp:', new Date().toISOString())
    
    // Verify the signature
    const isValid = await verifyWalletSignature(walletAddress, signature, message)
    if (!isValid) {
      console.log('Invalid signature for wallet:', walletAddress)
      return res.status(401).json({ error: 'Invalid signature' })
    }
    
    // Check message freshness (prevent replay attacks)
    try {
      const messageData = JSON.parse(message)
      const timestamp = messageData.timestamp
      const ageInMinutes = (Date.now() - timestamp) / 1000 / 60
      
      if (ageInMinutes > 5) {
        console.log('Message too old:', ageInMinutes, 'minutes')
        return res.status(401).json({ error: 'Authentication message expired' })
      }
    } catch (parseError) {
      console.error('Error parsing message:', parseError)
      return res.status(400).json({ error: 'Invalid message format' })
    }

    // Check if user exists, create if not
    let user
    try {
      console.log('Checking if user exists in database...')
      user = await prisma.user.findUnique({
        where: { walletAddress }
      })
      console.log('User lookup result:', user ? 'USER FOUND' : 'USER NOT FOUND')
      if (user) {
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
        console.log('Database connection issue detected, attempting to reconnect...')
        // Give database a moment to recover
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Retry once
        try {
          user = await prisma.user.findUnique({
            where: { walletAddress }
          })
          console.log('Retry successful')
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
        console.log('Creating new user...')
        
        // For development, skip Genesis Token check
        const hasGenesisToken = false
        
        const userData = {
          walletAddress,
          tier: hasGenesisToken ? 'premium' : 'standard',
          walletSource: hasGenesisToken ? 'seeker' : 'app',
          genesisVerified: hasGenesisToken,
          allyBalance: 5000, // Start with 5000 ALLY for testing
          totalInteractionScore: 0
        }
        
        console.log('User data to create:', userData)
        
        user = await prisma.user.create({
          data: userData
        })

        console.log('=== NEW USER CREATED SUCCESSFULLY ===')
        console.log('User details:', {
          wallet: user.walletAddress,
          tier: user.tier,
          balance: user.allyBalance.toString(),
          createdAt: user.createdAt
        })
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
          console.log('User already exists, attempting to fetch again...')
          try {
            user = await prisma.user.findUnique({
              where: { walletAddress }
            })
            if (user) {
              console.log('Found existing user on second attempt')
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

    // Generate JWT
    const token = jwt.sign(
      { walletAddress },
      process.env.JWT_SECRET || 'dev-secret-key',
      { expiresIn: '7d' }
    )

    console.log('JWT token generated successfully')
    console.log('=== AUTHENTICATION SUCCESSFUL ===')

    res.json({
      success: true,
      token,
      user: {
        walletAddress: user.walletAddress,
        tier: user.tier,
        genesisVerified: user.genesisVerified,
        allyBalance: user.allyBalance.toString(),
        createdAt: user.createdAt
      },
      expiresIn: '7d'
    })
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
    
    console.log('Getting profile for:', walletAddress)

    const user = await prisma.user.findUnique({
      where: { walletAddress }
    })

    if (!user) {
      console.error('User not found in database:', walletAddress)
      return res.status(404).json({ error: 'User not found' })
    }

    console.log('Profile found:', {
      wallet: user.walletAddress,
      tier: user.tier,
      balance: user.allyBalance.toString()
    })

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
