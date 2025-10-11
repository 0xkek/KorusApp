import { PublicKey } from '@solana/web3.js';
import {
  connection,
  GAME_ESCROW_PROGRAM_ID,
} from '../config/solana';

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
}

export const gameEscrowService = new GameEscrowService();
