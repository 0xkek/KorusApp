import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import crypto from 'crypto';
import { logger } from '../utils/logger';

/**
 * Verify a Solana wallet signature
 * @param walletAddress - The wallet address that signed the message
 * @param message - The original message that was signed
 * @param signature - The signature to verify (base58 encoded)
 * @returns true if signature is valid, false otherwise
 */
export async function verifySignature(
  walletAddress: string,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    // Decode the signature from base58
    const signatureUint8 = bs58.decode(signature);

    // Convert message to Uint8Array
    const messageUint8 = new TextEncoder().encode(message);

    // Get the public key
    const publicKey = new PublicKey(walletAddress);
    const publicKeyUint8 = publicKey.toBytes();

    // Verify the signature
    const isValid = nacl.sign.detached.verify(
      messageUint8,
      signatureUint8,
      publicKeyUint8
    );

    if (!isValid) {
      logger.debug(`Invalid signature for wallet ${walletAddress}`);
      return false;
    }

    // Additional check: verify the signature timestamp is recent (< 5 minutes)
    const timestampMatch = message.match(/Timestamp: (\d+)/);
    if (timestampMatch) {
      const timestamp = parseInt(timestampMatch[1]);
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (now - timestamp > fiveMinutes) {
        logger.debug(`Signature timestamp too old for wallet ${walletAddress}`);
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Generate a message to be signed by the wallet
 * @param eventId - The event ID
 * @param projectName - The project name
 * @returns The message to be signed
 */
export function generateSignatureMessage(eventId: string, projectName: string): string {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');

  return `I want to join the ${projectName} whitelist.\nEvent ID: ${eventId}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
}
