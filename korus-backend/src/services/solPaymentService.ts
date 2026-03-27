import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { connection as solanaConnection, TREASURY_WALLET } from '../config/solana';

// Use the connection from solana config for game-related operations (devnet)
const connection = solanaConnection;

// Dedicated mainnet connection for payment verification (tips, shoutouts)
// Use explicit mainnet RPC env var, or SOLANA_RPC_URL if it's mainnet, or public fallback
// Note: HELIUS_API_KEY may be expired — don't auto-construct Helius URL from it
const MAINNET_RPC_URL = process.env.SOLANA_MAINNET_RPC_URL
  || process.env.SOLANA_RPC_URL
  || 'https://api.mainnet-beta.solana.com';
const mainnetConnection = new Connection(MAINNET_RPC_URL, 'confirmed');

// Platform wallet that receives SOL payments (use TREASURY_WALLET from config)
const PLATFORM_WALLET = TREASURY_WALLET.toBase58();

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

      // Check for replay — reject if signature already used in subscription payments
      const existingPayment = await prisma.subscriptionPayment.findFirst({
        where: { txSignature: transactionSignature }
      });
      if (existingPayment) {
        logger.error('Transaction signature already processed', { signature: transactionSignature });
        return false;
      }

      // Also check if this signature was the user's last payment (prevents double-credit)
      const user = await prisma.user.findUnique({
        where: { walletAddress: userWallet },
        select: { lastPaymentTxSignature: true }
      });
      if (user?.lastPaymentTxSignature === transactionSignature) {
        logger.error('Transaction signature already credited to this user', { signature: transactionSignature });
        return false;
      }

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
      const accountKeys = transaction.transaction.message.staticAccountKeys || transaction.transaction.message.getAccountKeys?.() || [];
      
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
      
      // Credit user's balance in database and record the signature to prevent replay
      await prisma.user.update({
        where: { walletAddress: userWallet },
        data: {
          solBalance: {
            increment: transferAmount
          },
          lastPaymentTxSignature: transactionSignature
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
        select: { solBalance: true }
      });

      return user ? Number(user.solBalance) : 0;
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
        select: { solBalance: true }
      });

      if (!user || Number(user.solBalance) < amount) {
        return false;
      }

      await prisma.user.update({
        where: { walletAddress },
        data: {
          solBalance: {
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
          solBalance: {
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

  /**
   * Verify a transaction exists and matches expected parameters
   * This is for direct payments (shoutouts, tips) that don't credit balance
   * Uses mainnet connection since payments happen on mainnet
   */
  static async verifyTransaction(
    fromWallet: string,
    toWallet: string,
    transactionSignature: string,
    expectedAmount: number,
    maxAgeMinutes: number = 5
  ): Promise<{ valid: boolean; error?: string; actualAmount?: number }> {
    try {
      logger.debug('Verifying transaction on mainnet', {
        from: fromWallet,
        to: toWallet,
        signature: transactionSignature,
        expectedAmount,
        rpc: MAINNET_RPC_URL.replace(/api-key=.*/, 'api-key=***')
      });

      // Get transaction details from mainnet blockchain (retry up to 15 times, tx may not be indexed yet)
      let transaction = null;
      for (let attempt = 0; attempt < 15; attempt++) {
        try {
          transaction = await mainnetConnection.getTransaction(transactionSignature, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed',
          });
        } catch (rpcErr) {
          logger.warn(`getTransaction RPC error (attempt ${attempt + 1}/15):`, rpcErr);
        }
        if (transaction) break;
        logger.info(`Transaction not found yet (attempt ${attempt + 1}/15), waiting...`, { signature: transactionSignature });
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      if (!transaction) {
        logger.error('Transaction not found on blockchain after 15 retries', {
          signature: transactionSignature,
          rpcUrl: MAINNET_RPC_URL.replace(/api-key=.*/, 'api-key=***'),
        });
        return { valid: false, error: 'Transaction not found on blockchain' };
      }

      logger.info('Transaction found on-chain', {
        signature: transactionSignature,
        slot: transaction.slot,
        blockTime: transaction.blockTime,
        err: transaction.meta?.err,
      });

      // Check if transaction was successful
      if (transaction.meta?.err) {
        logger.warn('Transaction failed on blockchain', {
          signature: transactionSignature,
          error: transaction.meta.err
        });
        return { valid: false, error: 'Transaction failed on blockchain' };
      }

      // Verify transaction is recent (prevent replay attacks)
      if (transaction.blockTime) {
        const transactionAge = Date.now() / 1000 - transaction.blockTime;
        const maxAgeSeconds = maxAgeMinutes * 60;

        if (transactionAge > maxAgeSeconds) {
          logger.warn('Transaction too old', {
            signature: transactionSignature,
            ageMinutes: Math.round(transactionAge / 60),
            maxAgeMinutes
          });
          return { valid: false, error: `Transaction is older than ${maxAgeMinutes} minutes` };
        }
      }

      // Verify the transaction involves the correct wallets and amount
      const preBalances = transaction.meta?.preBalances || [];
      const postBalances = transaction.meta?.postBalances || [];
      const accountKeys = transaction.transaction.message.staticAccountKeys || transaction.transaction.message.getAccountKeys?.() || [];

      // Debug: log all account keys in the transaction
      const keyStrings = [];
      for (let i = 0; i < accountKeys.length; i++) {
        keyStrings.push(accountKeys[i].toBase58());
      }
      logger.info('Transaction account keys', {
        signature: transactionSignature,
        keys: keyStrings,
        expectedFrom: fromWallet,
        expectedTo: toWallet,
        preBalances,
        postBalances,
      });

      let fromIndex = -1;
      let toIndex = -1;

      // Find the sender and receiver in the account keys
      for (let i = 0; i < accountKeys.length; i++) {
        const accountKey = accountKeys[i].toBase58();
        if (accountKey === fromWallet) fromIndex = i;
        if (accountKey === toWallet) toIndex = i;
      }

      if (fromIndex === -1) {
        logger.warn('Sender wallet not found in transaction', {
          signature: transactionSignature,
          expectedFrom: fromWallet
        });
        return { valid: false, error: 'Sender wallet not found in transaction' };
      }

      if (toIndex === -1) {
        logger.warn('Receiver wallet not found in transaction', {
          signature: transactionSignature,
          expectedTo: toWallet
        });
        return { valid: false, error: 'Receiver wallet not found in transaction' };
      }

      // Calculate the actual transfer amount
      const senderChange = (preBalances[fromIndex] - postBalances[fromIndex]) / LAMPORTS_PER_SOL;
      const receiverChange = (postBalances[toIndex] - preBalances[toIndex]) / LAMPORTS_PER_SOL;

      // The receiver should have gained approximately the expected amount
      // Allow for small variance due to rounding
      const variance = 0.001; // 0.001 SOL variance allowed

      if (receiverChange < (expectedAmount - variance)) {
        logger.warn('Transaction amount mismatch', {
          signature: transactionSignature,
          expected: expectedAmount,
          actual: receiverChange,
          senderChange
        });
        return {
          valid: false,
          error: `Amount mismatch: expected ${expectedAmount} SOL, but receiver got ${receiverChange} SOL`,
          actualAmount: receiverChange
        };
      }

      logger.info('Transaction verified successfully', {
        signature: transactionSignature,
        from: fromWallet,
        to: toWallet,
        amount: receiverChange
      });

      return { valid: true, actualAmount: receiverChange };
    } catch (error: any) {
      logger.error('Error verifying transaction', {
        error: error.message,
        signature: transactionSignature,
        from: fromWallet,
        to: toWallet
      });
      return { valid: false, error: `Verification error: ${error.message}` };
    }
  }
}

export default SolPaymentService;