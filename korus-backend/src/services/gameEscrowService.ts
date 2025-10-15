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
      console.error('Failed to verify game creation:', error);
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
      console.error('Failed to get next game ID:', error);
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
      console.error('Failed to fetch game state:', error);
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
        console.error('Contract state account not found - contract not initialized');
        return false;
      }

      console.log('✅ Contract state account exists');
      return true;
    } catch (error) {
      console.error('Contract not initialized:', error);
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
      logger.info(`Completing game ${gameId}, winner: ${winnerAddress || 'DRAW'}`);

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
        [Buffer.from('escrow'), gameIdBuffer],
        GAME_ESCROW_PROGRAM_ID
      );

      // Get game account to read player addresses
      const gameAccount = await connection.getAccountInfo(gamePda);
      if (!gameAccount) {
        logger.error(`Game ${gameId} not found on-chain`);
        return { success: false, error: 'Game not found on-chain' };
      }

      // Parse game data to get player addresses
      // Game layout: discriminator(8) + game_id(8) + player1(32) + player2(32) + wager(8) + status(1) + ...
      const player1 = new PublicKey(gameAccount.data.slice(16, 48));
      const player2 = new PublicKey(gameAccount.data.slice(48, 80));

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
