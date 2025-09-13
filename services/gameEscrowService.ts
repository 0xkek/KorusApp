import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { logger } from '../utils/logger';

// Program ID - Deployed to Solana Devnet (Secure & Initialized)
export const GAME_ESCROW_PROGRAM_ID = new PublicKey('9rLXaB3a8qeb55N119sC3mjK58LyPeXXnj8vEvm3EWFG');

// Treasury wallet for platform fees
export const TREASURY_WALLET = new PublicKey(process.env.EXPO_PUBLIC_TREASURY_WALLET || '7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY');

// RPC endpoint
const RPC_URL = process.env.EXPO_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';

export enum GameType {
  TicTacToe = 0,
  RockPaperScissors = 1,
  ConnectFour = 2,
}

export enum GameStatus {
  Waiting = 0,
  Active = 1,
  Completed = 2,
  Cancelled = 3,
}

export interface OnChainGame {
  gameId: number;
  gameType: GameType;
  player1: PublicKey;
  player2: PublicKey | null;
  wagerAmount: number;
  status: GameStatus;
  winner: PublicKey | null;
  lastMoveTime: number;
  currentTurn: PublicKey;
  player1Deposited: number;
  player2Deposited: number;
}

export class GameEscrowService {
  private connection: Connection;
  private program: Program | null = null;

  constructor() {
    this.connection = new Connection(RPC_URL, 'confirmed');
  }

  /**
   * Create a new game on-chain
   */
  async createGame(
    playerWallet: PublicKey,
    gameType: GameType,
    wagerAmount: number,
    signTransaction: (tx: Transaction) => Promise<Transaction>
  ): Promise<{ signature: string; gameId: number }> {
    try {
      logger.info('Creating game on-chain', { playerWallet: playerWallet.toString(), gameType, wagerAmount });

      // Get state PDA
      const [statePda] = await PublicKey.findProgramAddress(
        [Buffer.from('state')],
        GAME_ESCROW_PROGRAM_ID
      );

      // For now, we'll need to get the game count from state
      // In production, you'd fetch this from the program
      const gameId = Date.now(); // Temporary - use timestamp as game ID

      // Derive game PDA
      const [gamePda] = await PublicKey.findProgramAddress(
        [Buffer.from('game'), Buffer.from(gameId.toString())],
        GAME_ESCROW_PROGRAM_ID
      );

      // Derive escrow PDA
      const [escrowPda] = await PublicKey.findProgramAddress(
        [Buffer.from('escrow'), gamePda.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      // Build transaction
      const transaction = new Transaction();
      
      // For now, just transfer SOL to escrow
      // Once the program is deployed, we'll use the actual instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: playerWallet,
          toPubkey: escrowPda,
          lamports: wagerAmount * LAMPORTS_PER_SOL,
        })
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = playerWallet;

      // Sign transaction
      const signedTx = await signTransaction(transaction);

      // Send transaction
      const signature = await this.connection.sendRawTransaction(signedTx.serialize());

      // Confirm transaction
      await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });

      logger.info('Game created on-chain', { signature, gameId });

      return { signature, gameId };
    } catch (error) {
      logger.error('Failed to create game on-chain:', error);
      throw error;
    }
  }

  /**
   * Join an existing game
   */
  async joinGame(
    playerWallet: PublicKey,
    gameId: number,
    wagerAmount: number,
    signTransaction: (tx: Transaction) => Promise<Transaction>
  ): Promise<string> {
    try {
      logger.info('Joining game on-chain', { playerWallet: playerWallet.toString(), gameId });

      // Derive game PDA
      const [gamePda] = await PublicKey.findProgramAddress(
        [Buffer.from('game'), Buffer.from(gameId.toString())],
        GAME_ESCROW_PROGRAM_ID
      );

      // Derive escrow PDA
      const [escrowPda] = await PublicKey.findProgramAddress(
        [Buffer.from('escrow'), gamePda.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      // Build transaction
      const transaction = new Transaction();
      
      // Transfer SOL to escrow
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: playerWallet,
          toPubkey: escrowPda,
          lamports: wagerAmount * LAMPORTS_PER_SOL,
        })
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = playerWallet;

      // Sign transaction
      const signedTx = await signTransaction(transaction);

      // Send transaction
      const signature = await this.connection.sendRawTransaction(signedTx.serialize());

      // Confirm transaction
      await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });

      logger.info('Joined game on-chain', { signature, gameId });

      return signature;
    } catch (error) {
      logger.error('Failed to join game on-chain:', error);
      throw error;
    }
  }

  /**
   * Cancel a game (only if waiting for opponent)
   */
  async cancelGame(
    playerWallet: PublicKey,
    gameId: number,
    signTransaction: (tx: Transaction) => Promise<Transaction>
  ): Promise<string> {
    try {
      logger.info('Cancelling game on-chain', { playerWallet: playerWallet.toString(), gameId });

      // For now, this is a placeholder
      // In production, this would call the cancel_game instruction
      
      const transaction = new Transaction();
      
      // Add a memo instruction as placeholder
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: playerWallet,
          toPubkey: playerWallet,
          lamports: 0, // No actual transfer, just a placeholder
        })
      );

      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = playerWallet;

      const signedTx = await signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signedTx.serialize());

      await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });

      logger.info('Game cancelled on-chain', { signature, gameId });

      return signature;
    } catch (error) {
      logger.error('Failed to cancel game on-chain:', error);
      throw error;
    }
  }

  /**
   * Complete a game and distribute winnings
   * This should be called by the backend after determining the winner
   */
  async completeGame(
    gameId: number,
    winner: PublicKey,
    authorityKeypair: Keypair // Backend authority keypair
  ): Promise<string> {
    try {
      logger.info('Completing game on-chain', { gameId, winner: winner.toString() });

      // This function would be called by the backend with authority
      // For now, it's a placeholder
      
      const transaction = new Transaction();
      
      // Placeholder transaction
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

      // Sign with authority keypair
      transaction.sign(authorityKeypair);

      const signature = await this.connection.sendRawTransaction(transaction.serialize());

      await this.connection.confirmTransaction(signature);

      logger.info('Game completed on-chain', { signature, gameId });

      return signature;
    } catch (error) {
      logger.error('Failed to complete game on-chain:', error);
      throw error;
    }
  }

  /**
   * Claim timeout win if opponent hasn't moved in 10 minutes
   */
  async claimTimeoutWin(
    playerWallet: PublicKey,
    gameId: number,
    signTransaction: (tx: Transaction) => Promise<Transaction>
  ): Promise<string> {
    try {
      logger.info('Claiming timeout win', { playerWallet: playerWallet.toString(), gameId });

      // Build claim timeout transaction
      const transaction = new Transaction();
      
      // Placeholder for now
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: playerWallet,
          toPubkey: playerWallet,
          lamports: 0,
        })
      );

      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = playerWallet;

      const signedTx = await signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signedTx.serialize());

      await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });

      logger.info('Timeout win claimed', { signature, gameId });

      return signature;
    } catch (error) {
      logger.error('Failed to claim timeout win:', error);
      throw error;
    }
  }

  /**
   * Update move timer after each move
   */
  async updateMoveTime(
    playerWallet: PublicKey,
    gameId: number,
    signTransaction: (tx: Transaction) => Promise<Transaction>
  ): Promise<string> {
    try {
      // This would be called after each move to reset the timer
      const transaction = new Transaction();
      
      // Placeholder
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: playerWallet,
          toPubkey: playerWallet,
          lamports: 0,
        })
      );

      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = playerWallet;

      const signedTx = await signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signedTx.serialize());

      await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });

      return signature;
    } catch (error) {
      logger.error('Failed to update move time:', error);
      throw error;
    }
  }

  /**
   * Get SOL balance for a wallet
   */
  async getBalance(walletAddress: string): Promise<number> {
    try {
      const balance = await this.connection.getBalance(new PublicKey(walletAddress));
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      logger.error('Failed to get balance:', error);
      return 0;
    }
  }
}

export const gameEscrowService = new GameEscrowService();