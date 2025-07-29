import { Connection, PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'
import nacl from 'tweetnacl'

const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
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
    
    const messageBytes = new TextEncoder().encode(message)
    const signatureBytes = bs58.decode(signature)
    const publicKeyBytes = new PublicKey(publicKey).toBytes()
    
    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)
    console.log('Signature verification result:', isValid)
    
    return isValid
  } catch (error) {
    console.error('Signature verification error:', error)
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