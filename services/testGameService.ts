import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export class TestGameService {
  private connection: Connection;
  private programId: PublicKey;

  constructor() {
    this.connection = new Connection(config.solanaRpcUrl, 'confirmed');
    this.programId = new PublicKey(config.gameEscrowProgramId);
  }

  /**
   * Test if the program exists on chain
   */
  async testProgramExists(): Promise<boolean> {
    try {
      logger.log('Testing program at:', this.programId.toBase58());
      const accountInfo = await this.connection.getAccountInfo(this.programId);
      
      if (accountInfo) {
        logger.log('✅ Program found on chain!', {
          owner: accountInfo.owner.toBase58(),
          executable: accountInfo.executable,
          lamports: accountInfo.lamports / LAMPORTS_PER_SOL
        });
        return true;
      } else {
        logger.error('❌ Program not found on chain');
        return false;
      }
    } catch (error) {
      logger.error('Failed to check program:', error);
      return false;
    }
  }

  /**
   * Test connection to Solana
   */
  async testConnection(): Promise<boolean> {
    try {
      const version = await this.connection.getVersion();
      logger.log('✅ Connected to Solana:', version);
      
      const slot = await this.connection.getSlot();
      logger.log('Current slot:', slot);
      
      return true;
    } catch (error) {
      logger.error('❌ Failed to connect to Solana:', error);
      return false;
    }
  }

  /**
   * Get balance of a wallet
   */
  async getBalance(address: string): Promise<number> {
    try {
      const pubkey = new PublicKey(address);
      const balance = await this.connection.getBalance(pubkey);
      const sol = balance / LAMPORTS_PER_SOL;
      logger.log(`Wallet ${address} balance: ${sol} SOL`);
      return sol;
    } catch (error) {
      logger.error('Failed to get balance:', error);
      return 0;
    }
  }
}

export const testGameService = new TestGameService();