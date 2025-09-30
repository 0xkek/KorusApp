import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { logger } from '../utils/logger';
import { solanaMobileService } from '../utils/solanaMobile';
import { config } from '../config/environment';

// Platform wallet that receives shoutout payments
const PLATFORM_WALLET = '7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY'; // Your actual Korus platform wallet

// Shoutout pricing (must match backend)
export const SHOUTOUT_PRICES: { [key: number]: number } = {
  10: 0.05,
  20: 0.10,
  30: 0.18,
  60: 0.35,
  120: 0.70,
  180: 1.30,
  240: 2.00
};

export class ShoutoutPaymentService {
  private static connection: Connection;
  
  static initialize() {
    // Use mainnet for production, devnet for testing
    const rpcUrl = __DEV__ 
      ? 'https://api.devnet.solana.com'
      : 'https://api.mainnet-beta.solana.com';
    
    this.connection = new Connection(rpcUrl, 'confirmed');
    logger.info('Shoutout payment service initialized', { rpcUrl });
  }
  
  /**
   * Process a shoutout payment
   * @param duration - Shoutout duration in minutes
   * @param userWalletAddress - User's wallet address
   * @param signTransaction - Function to sign transaction (from wallet adapter)
   * @returns Transaction signature
   */
  static async processShoutoutPayment(
    duration: number,
    userWalletAddress: string,
    signTransaction: (transaction: Transaction) => Promise<Transaction>
  ): Promise<string> {
    try {
      logger.info('Processing shoutout payment', { duration, userWalletAddress });
      
      // Get price for duration
      const priceInSol = SHOUTOUT_PRICES[duration];
      if (!priceInSol) {
        throw new Error(`Invalid shoutout duration: ${duration}`);
      }
      
      // Convert to lamports
      const lamports = Math.floor(priceInSol * LAMPORTS_PER_SOL);
      
      // Create public keys
      const fromPubkey = new PublicKey(userWalletAddress);
      const toPubkey = new PublicKey(PLATFORM_WALLET);
      
      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );
      
      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;
      
      logger.info('Transaction created', { 
        from: userWalletAddress, 
        to: PLATFORM_WALLET, 
        amount: priceInSol,
        lamports 
      });
      
      // Sign transaction using wallet adapter
      const signedTransaction = await signTransaction(transaction);
      
      // Send transaction
      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        }
      );
      
      logger.info('Transaction sent', { signature });
      
      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }
      
      logger.info('Transaction confirmed', { signature });
      
      return signature;
    } catch (error) {
      logger.error('Shoutout payment failed', { error });
      throw error;
    }
  }
  
  /**
   * Verify a transaction signature
   * @param signature - Transaction signature to verify
   * @param expectedAmount - Expected amount in SOL
   * @returns Boolean indicating if transaction is valid
   */
  static async verifyTransaction(
    signature: string,
    expectedAmount: number
  ): Promise<boolean> {
    try {
      const transaction = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0
      });
      
      if (!transaction) {
        logger.error('Transaction not found', { signature });
        return false;
      }
      
      // Check if transaction was successful
      if (transaction.meta?.err) {
        logger.error('Transaction failed', { signature, error: transaction.meta.err });
        return false;
      }
      
      // Verify amount and recipient
      // This is a simplified check - in production you'd want more thorough verification
      const platformPubkey = new PublicKey(PLATFORM_WALLET);
      const accountKeys = transaction.transaction.message.getAccountKeys();
      
      // Check if platform wallet is in the transaction
      const platformIndex = accountKeys.staticAccountKeys.findIndex(
        key => key.equals(platformPubkey)
      );
      
      if (platformIndex === -1) {
        logger.error('Platform wallet not found in transaction', { signature });
        return false;
      }
      
      // Verify amount (check post balances)
      const preBalance = transaction.meta.preBalances[platformIndex];
      const postBalance = transaction.meta.postBalances[platformIndex];
      const received = (postBalance - preBalance) / LAMPORTS_PER_SOL;
      
      if (received < expectedAmount * 0.99) { // Allow 1% variance for fees
        logger.error('Incorrect amount received', { 
          expected: expectedAmount, 
          received, 
          signature 
        });
        return false;
      }
      
      logger.info('Transaction verified', { signature, amount: received });
      return true;
    } catch (error) {
      logger.error('Transaction verification failed', { error, signature });
      return false;
    }
  }
  
  /**
   * Get platform wallet address
   */
  static getPlatformWallet(): string {
    return PLATFORM_WALLET;
  }
}

// Initialize on import
ShoutoutPaymentService.initialize();

export default ShoutoutPaymentService;