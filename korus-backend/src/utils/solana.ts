import { Connection, PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'
import nacl from 'tweetnacl'

// Use mainnet in production, devnet otherwise
const getRpcUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
  }
  return process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
}

const connection = new Connection(
  getRpcUrl(),
  'confirmed'
)

// Mock Genesis Token mint for now (we'll update this later)
const SEEKER_GENESIS_MINT = new PublicKey('11111111111111111111111111111111')

export const verifyWalletSignature = async (
  publicKey: string,
  signature: string,
  message: string
): Promise<boolean> => {
  try {
    console.log('Verifying signature:', {
      publicKey,
      signatureLength: signature.length,
      messageLength: message.length,
      messagePreview: message.substring(0, 100)
    })
    
    // Decode everything properly
    const messageBytes = new TextEncoder().encode(message)
    let signatureBytes: Uint8Array
    let publicKeyBytes: Uint8Array
    
    try {
      // Try to decode signature as base58
      signatureBytes = bs58.decode(signature)
      console.log('Signature decoded as base58, length:', signatureBytes.length)
    } catch (e) {
      console.error('Failed to decode signature as base58:', e)
      throw new Error('Invalid signature format')
    }
    
    try {
      // Decode public key
      publicKeyBytes = new PublicKey(publicKey).toBytes()
      console.log('Public key decoded, length:', publicKeyBytes.length)
    } catch (e) {
      console.error('Failed to decode public key:', e)
      throw new Error('Invalid public key format')
    }
    
    // Verify signature
    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)
    console.log('Signature verification result:', isValid)
    
    return isValid
  } catch (error: any) {
    console.error('Signature verification error:', error.message)
    console.error('Full error:', error)
    return false
  }
}

export const checkGenesisTokenOwnership = async (walletAddress: string): Promise<boolean> => {
  try {
    // For now, we'll mock this - return false (no Seeker verification)
    // Later we'll implement real Genesis Token checking
    console.log(`Checking Genesis Token for: ${walletAddress}`)
    return false // Mock: no one has Genesis Token yet
  } catch (error) {
    console.error('Error checking Genesis Token:', error)
    return false
  }
}