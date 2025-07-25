import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../config/database'
import { verifyWalletSignature, checkGenesisTokenOwnership } from '../utils/solana'
import { AuthRequest } from '../middleware/auth'
import { isMockMode, mockAuthController } from '../middleware/mockMode'

export const connectWallet = async (req: Request, res: Response) => {
  // Always use mock mode for now to bypass database issues
  return mockAuthController.connectWallet(req, res);
  
  try {
    const { walletAddress, signature, message } = req.body

    // Validate input
    if (!walletAddress || !signature || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: walletAddress, signature, message' 
      })
    }

    // For now, skip signature verification for testing
    console.log('Wallet connection attempt:', walletAddress)

    // Check if user exists, create if not
    let user
    try {
      user = await prisma.user.findUnique({
        where: { walletAddress }
      })
      console.log('User lookup successful:', user ? 'found' : 'not found')
    } catch (findError: any) {
      console.error('Database find error:', findError)
      throw new Error(`Database find failed: ${findError?.message || String(findError)}`)
    }

    if (!user) {
      try {
        // Check for Genesis Token (Seeker verification)
        const hasGenesisToken = await checkGenesisTokenOwnership(walletAddress)
        
        user = await prisma.user.create({
          data: {
            walletAddress,
            tier: hasGenesisToken ? 'premium' : 'standard',
            walletSource: hasGenesisToken ? 'seeker' : 'app',
            genesisVerified: hasGenesisToken
          }
        })

        console.log(`New user created: ${walletAddress} (${user.tier})`)
      } catch (createError: any) {
        console.error('Database create error:', createError)
        throw new Error(`Database create failed: ${createError?.message || String(createError)}`)
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { walletAddress },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    res.json({
      success: true,
      token,
      user: {
        walletAddress: user.walletAddress,
        tier: user.tier,
        genesisVerified: user.genesisVerified,
        allyBalance: user.allyBalance.toString(),
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    console.error('Connect wallet error:', error)
    res.status(500).json({ error: 'Failed to connect wallet' })
  }
}

export const getProfile = async (req: AuthRequest, res: Response) => {
  // Use mock mode if database is not available
  if (isMockMode()) {
    return mockAuthController.getProfile(req, res);
  }
  
  try {
    const walletAddress = req.userWallet!

    const user = await prisma.user.findUnique({
      where: { walletAddress }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
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
