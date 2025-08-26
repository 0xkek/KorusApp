import { Router } from 'express'
import { connectWallet, getProfile, updateProfile } from '../controllers/authController'
import { authenticate } from '../middleware/auth'
import { validateWalletConnect } from '../middleware/validation'
import { generateCSRFToken } from '../middleware/security'
import { authRateLimiter, burstProtection } from '../middleware/advancedRateLimiter'

const router = Router()

// CSRF token generation endpoint
router.get('/csrf', (req, res) => {
  const sessionId = req.headers['x-session-id'] as string
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID required' })
  }
  
  // Generate CSRF token using the security middleware function
  const token = generateCSRFToken(sessionId)
  
  res.json({ token })
})

// Wrapper to handle async errors in Express
const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// POST /api/auth/connect - Connect wallet and get JWT
router.post('/connect', burstProtection, authRateLimiter, validateWalletConnect, asyncHandler(connectWallet))

// GET /api/auth/profile - Get user profile (requires auth)
router.get('/profile', authenticate, asyncHandler(getProfile))

// PUT /api/auth/profile - Update user profile (requires auth)
router.put('/profile', authenticate, asyncHandler(updateProfile))

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