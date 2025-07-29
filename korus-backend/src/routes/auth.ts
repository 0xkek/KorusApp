import { Router } from 'express'
import { connectWallet, getProfile } from '../controllers/authController'
import { authenticate } from '../middleware/auth'
import { validateWalletConnect } from '../middleware/validation'
import { authLimiter } from '../middleware/rateLimiter'

const router = Router()

// Wrapper to handle async errors in Express
const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// POST /api/auth/connect - Connect wallet and get JWT
router.post('/connect', validateWalletConnect, asyncHandler(connectWallet))

// GET /api/auth/profile - Get user profile (requires auth)
router.get('/profile', authenticate, asyncHandler(getProfile))

// TEST: Direct connect without validation
router.post('/connect-test', asyncHandler(async (req: any, res: any) => {
  console.log('TEST ENDPOINT HIT')
  console.log('Body:', req.body)
  res.json({ success: true, message: 'Test endpoint reached' })
}))

// TEST: Minimal signature verification
router.post('/verify-test', asyncHandler(async (req: any, res: any) => {
  const { walletAddress, signature, message } = req.body
  console.log('VERIFY TEST:', { walletAddress, signature, message })
  
  try {
    const bs58 = require('bs58')
    const nacl = require('tweetnacl')
    const { PublicKey } = require('@solana/web3.js')
    
    // Test decoding
    const messageBytes = new TextEncoder().encode(message)
    console.log('Message bytes length:', messageBytes.length)
    
    const signatureBytes = bs58.decode(signature)
    console.log('Signature bytes length:', signatureBytes.length)
    
    const publicKeyBytes = new PublicKey(walletAddress).toBytes()
    console.log('Public key bytes length:', publicKeyBytes.length)
    
    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)
    console.log('Verification result:', isValid)
    
    res.json({ success: true, isValid })
  } catch (error: any) {
    console.error('VERIFY TEST ERROR:', error.message)
    res.json({ success: false, error: error.message })
  }
}))

export default router