import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import prisma from '../config/database';
import { logger } from '../utils/logger';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

// Platform wallet that receives SOL payments
const PLATFORM_WALLET = process.env.PLATFORM_WALLET_ADDRESS || 'YOUR_PLATFORM_WALLET_HERE';

export class SolPaymentService {
  /**
   * Verify a SOL transaction and credit user's balance
   */
  static async verifySolPayment(
    userWallet: string,
    transactionSignature: string,
    expectedAmount: number
  ): Promise<boolean> {
    try {
      logger.info('Verifying SOL payment', { userWallet, signature: transactionSignature, expectedAmount });
      
      // Get transaction details
      const transaction = await connection.getTransaction(transactionSignature, {
        maxSupportedTransactionVersion: 0
      });
      
      if (!transaction) {
        logger.error('Transaction not found', { signature: transactionSignature });
        return false;
      }
      
      // Verify the transaction was successful
      if (transaction.meta?.err) {
        logger.error('Transaction failed', { signature: transactionSignature, error: transaction.meta.err });
        return false;
      }
      
      // Check if transaction is from the user to platform wallet
      const fromPubkey = new PublicKey(userWallet);
      const toPubkey = new PublicKey(PLATFORM_WALLET);
      
      // Find the transfer instruction
      let transferAmount = 0;
      let foundTransfer = false;
      
      // Check account balances before and after
      const preBalances = transaction.meta?.preBalances || [];
      const postBalances = transaction.meta?.postBalances || [];
      const accountKeys = transaction.transaction.message.accountKeys;
      
      for (let i = 0; i < accountKeys.length; i++) {
        const accountKey = accountKeys[i];
        
        // Check if this is our platform wallet receiving funds
        if (accountKey.toBase58() === PLATFORM_WALLET) {
          const received = (postBalances[i] - preBalances[i]) / LAMPORTS_PER_SOL;
          if (received >= expectedAmount * 0.99) { // Allow 1% variance for fees
            transferAmount = received;
            foundTransfer = true;
            break;
          }
        }
      }
      
      if (!foundTransfer) {
        logger.error('Transfer not found or amount mismatch', {
          signature: transactionSignature,
          expectedAmount,
          transferAmount
        });
        return false;
      }
      
      // Credit user's balance in database
      await prisma.user.update({
        where: { walletAddress: userWallet },
        data: {
          balance: {
            increment: transferAmount
          }
        }
      });
      
      logger.info('SOL payment verified and balance credited', {
        userWallet,
        amount: transferAmount,
        signature: transactionSignature
      });
      
      return true;
    } catch (error) {
      logger.error('Error verifying SOL payment', { error, userWallet, signature: transactionSignature });
      return false;
    }
  }
  
  /**
   * Check user's on-chain SOL balance
   */
  static async getOnChainBalance(walletAddress: string): Promise<number> {
    try {
      const pubkey = new PublicKey(walletAddress);
      const balance = await connection.getBalance(pubkey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      logger.error('Error fetching on-chain balance', { error, walletAddress });
      return 0;
    }
  }
  
  /**
   * Get user's app balance from database
   */
  static async getAppBalance(walletAddress: string): Promise<number> {
    try {
      const user = await prisma.user.findUnique({
        where: { walletAddress },
        select: { balance: true }
      });
      
      return user ? Number(user.balance) : 0;
    } catch (error) {
      logger.error('Error fetching app balance', { error, walletAddress });
      return 0;
    }
  }
  
  /**
   * Deduct balance for a purchase (already implemented in postsController for shoutouts)
   */
  static async deductBalance(walletAddress: string, amount: number): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { walletAddress },
        select: { balance: true }
      });
      
      if (!user || Number(user.balance) < amount) {
        return false;
      }
      
      await prisma.user.update({
        where: { walletAddress },
        data: {
          balance: {
            decrement: amount
          }
        }
      });
      
      return true;
    } catch (error) {
      logger.error('Error deducting balance', { error, walletAddress, amount });
      return false;
    }
  }
  
  /**
   * Process refund if needed
   */
  static async refundBalance(walletAddress: string, amount: number, reason: string): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { walletAddress },
        data: {
          balance: {
            increment: amount
          }
        }
      });
      
      logger.info('Balance refunded', { walletAddress, amount, reason });
      return true;
    } catch (error) {
      logger.error('Error refunding balance', { error, walletAddress, amount });
      return false;
    }
  }
}

export default SolPaymentService;