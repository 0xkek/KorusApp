import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  Keypair
} from '@solana/web3.js';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export class GameTransactionService {
  private connection: Connection;
  private programId: PublicKey;

  constructor() {
    this.connection = new Connection(config.solanaRpcUrl, 'confirmed');
    this.programId = new PublicKey(config.gameEscrowProgramId);
  }

  /**
   * Create a simple test transaction to verify wallet connectivity
   */
  async createTestTransaction(walletAddress: string): Promise<Transaction> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const transaction = new Transaction();
      
      // Add a simple SOL transfer to self (0 SOL) as a test
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 0,
        })
      );

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      return transaction;
    } catch (error) {
      logger.error('Failed to create test transaction:', error);
      throw error;
    }
  }

  /**
   * Create a game using Mobile Wallet Adapter with simplified flow
   */
  async createGameWithSimpleMWA(
    gameType: number,
    wagerAmount: number
  ): Promise<string> {
    try {
      logger.log('Creating game with simplified MWA flow:', { gameType, wagerAmount });

      const result = await transact(async (wallet) => {
        logger.log('MWA transact started');
        
        // Step 1: Authorize with devnet (use solana: prefix as per docs)
        const authResult = await wallet.authorize({
          cluster: 'solana:devnet',
          identity: {
            name: 'Korus',
            uri: 'https://korus.app',
            icon: 'favicon.ico'
          }
        });
        
        logger.log('Authorization successful');
        
        // Get wallet public key
        const addressBytes = Buffer.from(authResult.accounts[0].address, 'base64');
        const publicKey = new PublicKey(addressBytes);
        logger.log('Wallet address:', publicKey.toBase58());
        
        // For now, create a simple test transaction to verify wallet works
        const transaction = new Transaction();
        const wagerLamports = Math.floor(wagerAmount * LAMPORTS_PER_SOL);
        
        // Generate a temporary escrow address (will be replaced with PDA later)
        const tempEscrow = Keypair.generate().publicKey;
        
        // Add a simple transfer as a test (not to the program yet)
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: tempEscrow,
            lamports: wagerLamports,
          })
        );
        
        // Get recent blockhash
        const { blockhash } = await this.connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;
        
        logger.log('Transaction created, requesting signature...');
        
        // Sign the transaction
        const serializedTx = transaction.serialize({
          requireAllSignatures: false,
          verifySignatures: false
        });
        
        const signedTxs = await wallet.signTransactions({
          transactions: [serializedTx]
        });
        
        logger.log('Transaction signed');
        
        // Send the transaction
        const signature = await wallet.signAndSendTransactions({
          transactions: signedTxs
        });
        
        logger.log('Transaction sent:', signature[0]);
        
        // Wait for confirmation
        await this.connection.confirmTransaction(signature[0], 'confirmed');
        
        return {
          signature: signature[0],
          escrowAddress: tempEscrow.toBase58()
        };
      });
      
      logger.log('Game created successfully:', result);
      return result.escrowAddress;
      
    } catch (error: any) {
      logger.error('Failed to create game with MWA:', error);
      
      // Provide more specific error messages
      if (error?.message?.includes('timeout')) {
        throw new Error('Wallet connection timed out. Please ensure Phantom is open and try again.');
      } else if (error?.message?.includes('rejected')) {
        throw new Error('Transaction was rejected by the wallet.');
      } else if (error?.message?.includes('insufficient')) {
        throw new Error('Insufficient SOL balance for this transaction.');
      }
      
      throw new Error(error?.message || 'Failed to create game. Please try again.');
    }
  }

  /**
   * Test wallet connection without creating a game
   */
  async testWalletConnection(): Promise<boolean> {
    try {
      logger.log('Testing wallet connection...');
      
      const result = await transact(async (wallet) => {
        logger.log('MWA test transact started');
        
        // Just authorize and get the address (use solana: prefix)
        const authResult = await wallet.authorize({
          cluster: 'solana:devnet',
          identity: {
            name: 'Korus',
            uri: 'https://korus.app',
            icon: 'favicon.ico'
          }
        });
        
        const addressBytes = Buffer.from(authResult.accounts[0].address, 'base64');
        const publicKey = new PublicKey(addressBytes);
        
        logger.log('Test connection successful, wallet:', publicKey.toBase58());
        return true;
      });
      
      return result;
    } catch (error) {
      logger.error('Wallet connection test failed:', error);
      return false;
    }
  }
}

export const gameTransactionService = new GameTransactionService();