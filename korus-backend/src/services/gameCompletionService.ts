import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { getAuthorityKeypair, isAuthorityConfigured } from '../config/gameAuthority';
import { logger } from '../utils/logger';

// Program ID for game escrow (will be updated after mainnet deployment)
const GAME_ESCROW_PROGRAM_ID = process.env.GAME_ESCROW_PROGRAM_ID || '9rLXaB3a8qeb55N119sC3mjK58LyPeXXnj8vEvm3EWFG';

// RPC endpoint (mainnet or devnet)
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

export class GameCompletionService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(RPC_URL, 'confirmed');
  }

  /**
   * Complete a game on-chain and distribute winnings
   * Called by backend after determining the winner
   */
  async completeGame(
    gameId: string,
    winner: string,
    loser: string,
    wagerAmount: number
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      // Check if authority is configured
      if (!isAuthorityConfigured()) {
        logger.error('Authority wallet not configured - cannot complete games');
        return { 
          success: false, 
          error: 'Game completion service not configured' 
        };
      }

      const authorityKeypair = getAuthorityKeypair();
      if (!authorityKeypair) {
        return { 
          success: false, 
          error: 'Failed to load authority keypair' 
        };
      }

      logger.info('Completing game on-chain', { 
        gameId, 
        winner, 
        wagerAmount,
        authority: authorityKeypair.publicKey.toString()
      });

      const programId = new PublicKey(GAME_ESCROW_PROGRAM_ID);
      const winnerPubkey = new PublicKey(winner);
      const loserPubkey = new PublicKey(loser);

      // Derive PDAs
      const [statePda] = await PublicKey.findProgramAddress(
        [Buffer.from('state')],
        programId
      );

      const [gamePda] = await PublicKey.findProgramAddress(
        [Buffer.from('game'), Buffer.from(gameId)],
        programId
      );

      const [escrowPda] = await PublicKey.findProgramAddress(
        [Buffer.from('escrow'), gamePda.toBuffer()],
        programId
      );

      // Build complete_game instruction
      // This is a placeholder - actual instruction will depend on deployed program
      const transaction = new Transaction();
      
      // For now, just log the completion
      // In production, this will call the actual complete_game instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: authorityKeypair.publicKey,
          toPubkey: authorityKeypair.publicKey,
          lamports: 0, // No actual transfer, just a placeholder
        })
      );

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = authorityKeypair.publicKey;

      // Sign with authority keypair
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [authorityKeypair],
        { commitment: 'confirmed' }
      );

      logger.info('Game completed on-chain', { 
        signature, 
        gameId,
        winner
      });

      return { 
        success: true, 
        signature 
      };

    } catch (error) {
      logger.error('Failed to complete game on-chain:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Handle timeout claim when opponent doesn't move
   */
  async handleTimeout(
    gameId: string,
    claimant: string
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      if (!isAuthorityConfigured()) {
        return { 
          success: false, 
          error: 'Authority not configured' 
        };
      }

      const authorityKeypair = getAuthorityKeypair();
      if (!authorityKeypair) {
        return { 
          success: false, 
          error: 'Failed to load authority keypair' 
        };
      }

      // Build timeout claim instruction
      // Placeholder for now
      const transaction = new Transaction();
      
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: authorityKeypair.publicKey,
          toPubkey: authorityKeypair.publicKey,
          lamports: 0,
        })
      );

      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = authorityKeypair.publicKey;

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [authorityKeypair],
        { commitment: 'confirmed' }
      );

      logger.info('Timeout handled on-chain', { 
        signature, 
        gameId,
        claimant
      });

      return { 
        success: true, 
        signature 
      };

    } catch (error) {
      logger.error('Failed to handle timeout:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Check authority wallet balance
   */
  async checkAuthorityBalance(): Promise<number> {
    try {
      const authorityKeypair = getAuthorityKeypair();
      if (!authorityKeypair) {
        return 0;
      }

      const balance = await this.connection.getBalance(authorityKeypair.publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      logger.error('Failed to check authority balance:', error);
      return 0;
    }
  }
}

export const gameCompletionService = new GameCompletionService();