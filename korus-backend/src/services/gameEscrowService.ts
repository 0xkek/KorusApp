import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import {
  connection,
  GAME_ESCROW_PROGRAM_ID,
  TREASURY_WALLET,
  loadAuthorityKeypair,
  getProvider,
} from '../config/solana';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class GameEscrowService {
  /**
   * Verify that a game was created on-chain by checking if the game PDA exists
   */
  async verifyGameCreation(gameId: number): Promise<boolean> {
    try {
      const gameIdBuffer = Buffer.alloc(8);
      gameIdBuffer.writeBigUInt64LE(BigInt(gameId));
      const [gamePda] = await PublicKey.findProgramAddress(
        [Buffer.from('game'), gameIdBuffer],
        GAME_ESCROW_PROGRAM_ID
      );

      const gameAccount = await connection.getAccountInfo(gamePda);
      return gameAccount !== null;
    } catch (error) {
      logger.error('Failed to verify game creation:', error);
      return false;
    }
  }

  /**
   * Get the current on-chain game counter (next game ID)
   */
  async getNextGameId(): Promise<number> {
    try {
      const [statePda] = await PublicKey.findProgramAddress(
        [Buffer.from('state')],
        GAME_ESCROW_PROGRAM_ID
      );

      const stateAccount = await connection.getAccountInfo(statePda);
      if (!stateAccount) {
        throw new Error('Contract state not found');
      }

      // State layout: discriminator(8) + authority(32) + treasury(32) + total_games(8) + ...
      // total_games starts at byte 72
      const totalGames = stateAccount.data.readBigUInt64LE(72);
      return Number(totalGames);
    } catch (error) {
      logger.error('Failed to get next game ID:', error);
      throw error;
    }
  }

  /**
   * Get game state from blockchain
   */
  async getGameState(gameId: number): Promise<any> {
    try {
      const gameIdBuffer = Buffer.alloc(8);
      gameIdBuffer.writeBigUInt64LE(BigInt(gameId));
      const [gamePda] = await PublicKey.findProgramAddress(
        [Buffer.from('game'), gameIdBuffer],
        GAME_ESCROW_PROGRAM_ID
      );

      const gameAccount = await connection.getAccountInfo(gamePda);
      return gameAccount;
    } catch (error) {
      logger.error('Failed to fetch game state:', error);
      return null;
    }
  }

  /**
   * Check if contract is initialized
   */
  async checkInitialization(): Promise<boolean> {
    try {
      const [statePda] = await PublicKey.findProgramAddress(
        [Buffer.from('state')],
        GAME_ESCROW_PROGRAM_ID
      );

      const stateAccount = await connection.getAccountInfo(statePda);
      if (!stateAccount) {
        logger.error('Contract state account not found - contract not initialized');
        return false;
      }

      logger.info('✅ Contract state account exists');
      return true;
    } catch (error) {
      logger.error('Contract not initialized:', error);
      return false;
    }
  }

  /**
   * Complete a game and distribute funds to winner
   * @param gameId - The on-chain game ID
   * @param winnerAddress - Winner's wallet address (or null for draw)
   */
  async completeGame(gameId: number, winnerAddress: string | null): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      logger.info(`🔒 SECURITY CHECK: Completing game ${gameId}, winner: ${winnerAddress || 'DRAW'}`);

      // ========================================
      // SECURITY: Database Validation Layer
      // ========================================
      // This prevents the authority wallet from completing unauthorized games
      // by verifying the game state in the database (which requires authenticated API calls to modify)

      // Find the game in database by onChainGameId
      const dbGame = await prisma.game.findFirst({
        where: {
          onChainGameId: BigInt(gameId),
        },
      });

      // Validate game exists in database
      if (!dbGame) {
        logger.error(`🚨 SECURITY: Game ${gameId} not found in database - unauthorized completion attempt blocked`);
        return { success: false, error: 'Game not found in database - cannot complete unauthorized game' };
      }

      // Validate game status is 'completed'
      if (dbGame.status !== 'completed') {
        logger.error(`🚨 SECURITY: Game ${gameId} has status '${dbGame.status}' (not 'completed') - unauthorized completion attempt blocked`);
        return { success: false, error: `Game status is '${dbGame.status}' - can only complete games with status 'completed'` };
      }

      // Validate winner matches between database and blockchain call
      if (winnerAddress) {
        if (dbGame.winner !== winnerAddress) {
          logger.error(`🚨 SECURITY: Winner mismatch for game ${gameId} - DB: ${dbGame.winner}, Call: ${winnerAddress} - unauthorized completion attempt blocked`);
          return { success: false, error: 'Winner mismatch between database and blockchain call' };
        }
      } else {
        // If winnerAddress is null (draw), database winner should also be null
        if (dbGame.winner !== null) {
          logger.error(`🚨 SECURITY: Draw mismatch for game ${gameId} - DB has winner ${dbGame.winner}, but call indicates draw - unauthorized completion attempt blocked`);
          return { success: false, error: 'Draw mismatch between database and blockchain call' };
        }
      }

      logger.info(`✅ SECURITY CHECK PASSED: Game ${gameId} validated in database`);
      logger.info(`   - Status: ${dbGame.status}`);
      logger.info(`   - Winner: ${dbGame.winner || 'DRAW'}`);
      logger.info(`   - Player1: ${dbGame.player1}`);
      logger.info(`   - Player2: ${dbGame.player2}`);

      // ========================================
      // Proceed with blockchain transaction
      // ========================================

      const authority = loadAuthorityKeypair();

      // Derive PDAs
      const gameIdBuffer = Buffer.alloc(8);
      gameIdBuffer.writeBigUInt64LE(BigInt(gameId));

      const [gamePda] = await PublicKey.findProgramAddress(
        [Buffer.from('game'), gameIdBuffer],
        GAME_ESCROW_PROGRAM_ID
      );

      const [statePda] = await PublicKey.findProgramAddress(
        [Buffer.from('state')],
        GAME_ESCROW_PROGRAM_ID
      );

      const [escrowPda] = await PublicKey.findProgramAddress(
        [Buffer.from('escrow'), gamePda.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      // Get game account to read player addresses
      logger.info(`Fetching game account at PDA: ${gamePda.toString()}`);
      const gameAccount = await connection.getAccountInfo(gamePda);
      if (!gameAccount) {
        logger.error(`Game ${gameId} not found on-chain at PDA: ${gamePda.toString()}`);
        return { success: false, error: 'Game not found on-chain' };
      }
      logger.info(`✅ Game account found, data length: ${gameAccount.data.length}`);


      // Parse game data to get player addresses
      // Game layout: discriminator(8) + game_id(8) + game_type(1) + player1(32) + player2(32) + wager(8) + status(1) + ...
      const player1 = new PublicKey(gameAccount.data.slice(17, 49));
      const player2 = new PublicKey(gameAccount.data.slice(49, 81));

      logger.info(`Players: ${player1.toString()} vs ${player2.toString()}`);

      // Derive player state PDAs (per-game state accounts) - reuse gameIdBuffer from above
      const [player1StatePda] = await PublicKey.findProgramAddress(
        [Buffer.from('player_game_state'), player1.toBuffer(), gameIdBuffer],
        GAME_ESCROW_PROGRAM_ID
      );

      const [player2StatePda] = await PublicKey.findProgramAddress(
        [Buffer.from('player_game_state'), player2.toBuffer(), gameIdBuffer],
        GAME_ESCROW_PROGRAM_ID
      );

      logger.info(`Player1 State PDA: ${player1StatePda.toString()}`);
      logger.info(`Player2 State PDA: ${player2StatePda.toString()}`);

      // Build complete_game instruction manually
      // Account order must match smart contract: state, game, player1State, player2State, escrow, treasury, player1, player2, authority, systemProgram
      const instruction = {
        programId: GAME_ESCROW_PROGRAM_ID,
        keys: [
          { pubkey: statePda, isSigner: false, isWritable: true }, // state
          { pubkey: gamePda, isSigner: false, isWritable: true }, // game
          { pubkey: player1StatePda, isSigner: false, isWritable: true }, // player1State
          { pubkey: player2StatePda, isSigner: false, isWritable: true }, // player2State
          { pubkey: escrowPda, isSigner: false, isWritable: true }, // escrow
          { pubkey: TREASURY_WALLET, isSigner: false, isWritable: true }, // treasury
          { pubkey: player1, isSigner: false, isWritable: true }, // player1
          { pubkey: player2, isSigner: false, isWritable: true }, // player2
          { pubkey: authority.publicKey, isSigner: true, isWritable: false }, // authority
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
        ],
        data: this.encodeCompleteGameInstruction(gameId, winnerAddress),
      };

      const transaction = new Transaction().add(instruction);

      // Send and confirm transaction
      const signature = await connection.sendTransaction(transaction, [authority], {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      logger.info(`Sent complete_game transaction: ${signature}`);

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        logger.error(`Transaction failed:`, confirmation.value.err);
        return { success: false, error: 'Transaction failed' };
      }

      logger.info(`✅ Game ${gameId} completed successfully! Signature: ${signature}`);
      return { success: true, signature };

    } catch (error: any) {
      logger.error(`Error completing game:`, error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Cancel a game and refund the wager to player1
   * @param gameId - The on-chain game ID
   */
  async cancelGame(gameId: number): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      logger.info(`Cancelling game ${gameId} and refunding player1`);

      const authority = loadAuthorityKeypair();

      // Derive PDAs
      const gameIdBuffer = Buffer.alloc(8);
      gameIdBuffer.writeBigUInt64LE(BigInt(gameId));

      const [gamePda] = await PublicKey.findProgramAddress(
        [Buffer.from('game'), gameIdBuffer],
        GAME_ESCROW_PROGRAM_ID
      );

      const [statePda] = await PublicKey.findProgramAddress(
        [Buffer.from('state')],
        GAME_ESCROW_PROGRAM_ID
      );

      const [escrowPda] = await PublicKey.findProgramAddress(
        [Buffer.from('escrow'), gamePda.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      // Get game account to read player1 address
      logger.info(`Fetching game account at PDA: ${gamePda.toString()}`);
      const gameAccount = await connection.getAccountInfo(gamePda);
      if (!gameAccount) {
        logger.error(`Game ${gameId} not found on-chain at PDA: ${gamePda.toString()}`);
        return { success: false, error: 'Game not found on-chain' };
      }
      logger.info(`✅ Game account found, data length: ${gameAccount.data.length}`);

      // Parse game data to get player1 address
      // Game layout: discriminator(8) + game_id(8) + game_type(1) + player1(32) + ...
      const player1 = new PublicKey(gameAccount.data.slice(17, 49));

      logger.info(`Refunding player1: ${player1.toString()}`);

      // Derive player1 state PDA
      const [player1StatePda] = await PublicKey.findProgramAddress(
        [Buffer.from('player_game_state'), player1.toBuffer(), gameIdBuffer],
        GAME_ESCROW_PROGRAM_ID
      );

      logger.info(`Player1 State PDA: ${player1StatePda.toString()}`);

      // Build cancel_game instruction manually
      // Account order must match smart contract: state, game, player1State, escrow, player1, authority, systemProgram
      const instruction = {
        programId: GAME_ESCROW_PROGRAM_ID,
        keys: [
          { pubkey: statePda, isSigner: false, isWritable: true }, // state
          { pubkey: gamePda, isSigner: false, isWritable: true }, // game
          { pubkey: player1StatePda, isSigner: false, isWritable: true }, // player1State
          { pubkey: escrowPda, isSigner: false, isWritable: true }, // escrow
          { pubkey: player1, isSigner: false, isWritable: true }, // player1
          { pubkey: authority.publicKey, isSigner: true, isWritable: false }, // authority
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
        ],
        data: this.encodeCancelGameInstruction(),
      };

      const transaction = new Transaction().add(instruction);

      // Send and confirm transaction
      const signature = await connection.sendTransaction(transaction, [authority], {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      logger.info(`Sent cancel_game transaction: ${signature}`);

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        logger.error(`Transaction failed:`, confirmation.value.err);
        return { success: false, error: 'Transaction failed' };
      }

      logger.info(`✅ Game ${gameId} cancelled successfully! Refunded player1. Signature: ${signature}`);
      return { success: true, signature };

    } catch (error: any) {
      logger.error(`Error cancelling game:`, error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Cancel an expired game using authority (no player signature needed)
   * This is used by the automated expiration service
   * @param gameId - The on-chain game ID
   */
  async authorityCancelExpiredGame(gameId: number): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      logger.info(`🔄 Authority cancelling expired game ${gameId} and refunding player1`);

      const authority = loadAuthorityKeypair();

      // Derive PDAs
      const gameIdBuffer = Buffer.alloc(8);
      gameIdBuffer.writeBigUInt64LE(BigInt(gameId));

      const [gamePda] = await PublicKey.findProgramAddress(
        [Buffer.from('game'), gameIdBuffer],
        GAME_ESCROW_PROGRAM_ID
      );

      const [statePda] = await PublicKey.findProgramAddress(
        [Buffer.from('state')],
        GAME_ESCROW_PROGRAM_ID
      );

      const [escrowPda] = await PublicKey.findProgramAddress(
        [Buffer.from('escrow'), gamePda.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      // Get game account to read player1 address
      logger.info(`Fetching game account at PDA: ${gamePda.toString()}`);
      const gameAccount = await connection.getAccountInfo(gamePda);
      if (!gameAccount) {
        logger.error(`Game ${gameId} not found on-chain at PDA: ${gamePda.toString()}`);
        return { success: false, error: 'Game not found on-chain' };
      }
      logger.info(`✅ Game account found, data length: ${gameAccount.data.length}`);

      // Parse game data to get player1 address
      // Game layout: discriminator(8) + game_id(8) + game_type(1) + player1(32) + ...
      const player1 = new PublicKey(gameAccount.data.slice(17, 49));

      logger.info(`Refunding player1: ${player1.toString()}`);

      // Derive player1 state PDA
      const [player1StatePda] = await PublicKey.findProgramAddress(
        [Buffer.from('player_game_state'), player1.toBuffer(), gameIdBuffer],
        GAME_ESCROW_PROGRAM_ID
      );

      logger.info(`Player1 State PDA: ${player1StatePda.toString()}`);

      // Build authority_cancel_expired_game instruction manually
      // Account order must match smart contract AuthorityCancelExpiredGame context:
      // state, game, player_state, escrow, player1, authority, system_program
      const instruction = {
        programId: GAME_ESCROW_PROGRAM_ID,
        keys: [
          { pubkey: statePda, isSigner: false, isWritable: true }, // state
          { pubkey: gamePda, isSigner: false, isWritable: true }, // game
          { pubkey: player1StatePda, isSigner: false, isWritable: true }, // player_state
          { pubkey: escrowPda, isSigner: false, isWritable: true }, // escrow
          { pubkey: player1, isSigner: false, isWritable: true }, // player1 (does NOT need to sign!)
          { pubkey: authority.publicKey, isSigner: true, isWritable: false }, // authority
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
        ],
        data: this.encodeAuthorityCancelExpiredGameInstruction(),
      };

      const transaction = new Transaction().add(instruction);

      // Send and confirm transaction
      const signature = await connection.sendTransaction(transaction, [authority], {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      logger.info(`Sent authority_cancel_expired_game transaction: ${signature}`);

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        logger.error(`Transaction failed:`, confirmation.value.err);
        return { success: false, error: 'Transaction failed' };
      }

      logger.info(`✅ Game ${gameId} cancelled by authority! Refunded player1. Signature: ${signature}`);
      return { success: true, signature };

    } catch (error: any) {
      logger.error(`Error in authority cancel expired game:`, error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Encode the cancel_game instruction data
   * Instruction format: [instruction_discriminator(8)]
   */
  private encodeCancelGameInstruction(): Buffer {
    // Instruction discriminator for cancel_game
    // Calculated from SHA256("global:cancel_game")[0..8]
    const discriminator = Buffer.from([0x79, 0xc2, 0x9a, 0x76, 0x67, 0xeb, 0x95, 0x34]);
    return discriminator;
  }

  /**
   * Encode the authority_cancel_expired_game instruction data
   * Instruction format: [instruction_discriminator(8)]
   */
  private encodeAuthorityCancelExpiredGameInstruction(): Buffer {
    // Instruction discriminator for authority_cancel_expired_game
    // Calculated from SHA256("global:authority_cancel_expired_game")[0..8]
    const discriminator = Buffer.from([0xa6, 0xda, 0xd0, 0x97, 0xe6, 0xda, 0x6a, 0x06]);
    return discriminator;
  }

  /**
   * Encode the complete_game instruction data
   * Instruction format: [instruction_discriminator(8)] + [winner_option(1 + optional_32)]
   */
  private encodeCompleteGameInstruction(gameId: number, winnerAddress: string | null): Buffer {
    // Instruction discriminator for complete_game
    // Calculated from SHA256("global:complete_game")[0..8]
    const discriminator = Buffer.from([0x69, 0x45, 0xb8, 0x05, 0x8f, 0xb6, 0x5c, 0x84]);

    let winnerBuffer: Buffer;
    if (winnerAddress) {
      // Some(winner_pubkey): 1 byte for Some + 32 bytes for pubkey
      winnerBuffer = Buffer.alloc(33);
      winnerBuffer.writeUInt8(1, 0); // Some variant
      new PublicKey(winnerAddress).toBuffer().copy(winnerBuffer, 1);
    } else {
      // None: 1 byte
      winnerBuffer = Buffer.alloc(1);
      winnerBuffer.writeUInt8(0, 0); // None variant
    }

    return Buffer.concat([discriminator, winnerBuffer]);
  }
}

export const gameEscrowService = new GameEscrowService();
