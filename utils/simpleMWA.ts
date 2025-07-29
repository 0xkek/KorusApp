import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { authAPI } from './api';
import { logger } from './logger';

// Simple, direct MWA connection following official docs exactly
export async function connectWalletDirect() {
  logger.log('[SimpleMWA] Starting direct connection...');
  
  try {
    const result = await transact(async (wallet) => {
      logger.log('[SimpleMWA] Transact callback started');
      
      // Step 1: Authorize
      const authResult = await wallet.authorize({
        cluster: 'solana:devnet',
        identity: {
          name: 'Korus',
          uri: 'https://korusapp.com',
          icon: 'favicon.ico',
        },
      });
      
      logger.log('[SimpleMWA] Authorization result:', authResult);
      
      // Step 2: Get wallet address
      const addressBase64 = authResult.accounts[0].address;
      const addressBytes = Buffer.from(addressBase64, 'base64');
      const pubKey = new PublicKey(addressBytes);
      const walletAddress = pubKey.toBase58();
      
      logger.log('[SimpleMWA] Wallet address:', walletAddress);
      
      // Step 3: Sign authentication message
      const nonce = Math.random().toString(36).substring(2, 15);
      const authMessage = `Sign this message to authenticate with Korus\n\nNonce: ${nonce}`;
      const messageBytes = Buffer.from(authMessage, 'utf8');
      
      const signedMessages = await wallet.signMessages({
        addresses: [addressBase64],
        payloads: [messageBytes],
      });
      
      logger.log('[SimpleMWA] Signed messages received');
      
      // Extract signature
      const signedMessage = signedMessages[0];
      const signatureBytes = signedMessage.slice(-64);
      const signature = bs58.encode(signatureBytes);
      
      logger.log('[SimpleMWA] Signature created');
      
      // Step 4: Authenticate with backend
      const backendResult = await authAPI.connectWallet(
        walletAddress,
        signature,
        authMessage
      );
      
      logger.log('[SimpleMWA] Backend authentication result:', backendResult);
      
      return {
        walletAddress,
        token: backendResult.token,
        user: backendResult.user,
      };
    });
    
    logger.log('[SimpleMWA] Connection successful!');
    return result;
  } catch (error: any) {
    logger.error('[SimpleMWA] Connection error:', error);
    throw error;
  }
}