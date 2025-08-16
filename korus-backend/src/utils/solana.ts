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

// Genesis Token mint address from environment
const GENESIS_TOKEN_MINT = process.env.GENESIS_TOKEN_MINT 
  ? new PublicKey(process.env.GENESIS_TOKEN_MINT)
  : new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') // Default to devnet token

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
    console.log(`Checking Genesis Token for: ${walletAddress}`)
    
    const wallet = new PublicKey(walletAddress)
    
    // Get token accounts for this wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet, {
      mint: GENESIS_TOKEN_MINT
    })
    
    // Check if wallet has any Genesis tokens
    if (tokenAccounts.value.length > 0) {
      const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount
      console.log(`Genesis Token found! Balance: ${balance}`)
      return balance > 0
    }
    
    console.log('No Genesis Token found for wallet')
    return false
  } catch (error) {
    console.error('Error checking Genesis Token:', error)
    return false
  }
}