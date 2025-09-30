import '../structuredClonePolyfill';
import { PublicKey, Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL, TransactionInstruction, ComputeBudgetProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { config } from '../../config/environment';
import { logger } from '../logger';
import { Platform } from 'react-native';

// Program ID - Deployed to Solana Mainnet
export const GAME_ESCROW_PROGRAM_ID = new PublicKey('4iUdAkPRmZLzUFXTLpt5QPGmUUtP6yfgpPpF3sLD9xtd');

// Constants matching the contract
const MINIMUM_WAGER = 0.01 * LAMPORTS_PER_SOL; // 0.01 SOL
const MAXIMUM_WAGER = 1 * LAMPORTS_PER_SOL; // 1 SOL

export interface GameState {
  gameId: number;
  gameType: number;
  player1: PublicKey;
  player2: PublicKey | null;
  wagerAmount: number;
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  winner: PublicKey | null;
  createdAt: number;
  lastMoveTime: number;
  currentTurn: PublicKey | null;
}

export class GameEscrowDirectService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(config.solanaRpcUrl, 'confirmed');
  }

  /**
   * Create a new game with direct SOL transfer (no CPI)
   * This version uses a two-transaction approach to avoid simulation failures
   */
  async createGame(
    gameType: number,
    wagerAmount: number,
    walletProvider: any,
    walletAddress?: string
  ): Promise<string> {
    try {
      // Validate wager amount
      const wagerLamports = wagerAmount * LAMPORTS_PER_SOL;
      if (wagerLamports < MINIMUM_WAGER || wagerLamports > MAXIMUM_WAGER) {
        throw new Error(`Wager must be between 0.01 and 1 SOL`);
      }

      // Get wallet public key
      let walletPublicKey: PublicKey;

      if (walletAddress) {
        walletPublicKey = new PublicKey(walletAddress);
      } else if (walletProvider) {
        if (walletProvider.connect && typeof walletProvider.connect === 'function') {
          const walletPubkeyString = await walletProvider.connect();
          walletPublicKey = new PublicKey(walletPubkeyString);
        } else if (walletProvider.publicKey) {
          walletPublicKey = new PublicKey(walletProvider.publicKey.toString());
        } else if (typeof walletProvider === 'string') {
          walletPublicKey = new PublicKey(walletProvider);
        } else {
          throw new Error('Invalid wallet provider format');
        }
      } else {
        throw new Error('No wallet address or provider provided');
      }

      logger.log('Creating game with wallet:', walletPublicKey.toString());
      logger.log('Game type:', gameType, 'Wager:', wagerAmount, 'SOL');

      // Get state PDA first to read the next game ID
      const [statePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('state')],
        GAME_ESCROW_PROGRAM_ID
      );

      // Get current game counter from state
      const stateAccount = await this.connection.getAccountInfo(statePda);
      if (!stateAccount) {
        throw new Error('Game escrow state not initialized');
      }

      // Parse total_games from state (offset: 8 + 32 + 32 = 72)
      const totalGamesOffset = 72;
      const gameId = new BN(stateAccount.data.readBigUInt64LE(totalGamesOffset).toString());

      const [gamePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('game'), gameId.toArrayLike(Buffer, 'le', 8)],
        GAME_ESCROW_PROGRAM_ID
      );

      const [playerStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('player'), walletPublicKey.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), gamePda.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      logger.log('PDAs calculated:', {
        state: statePda.toString(),
        game: gamePda.toString(),
        playerState: playerStatePda.toString(),
        escrow: escrowPda.toString()
      });

      // Handle transaction based on platform
      let signature: string;

      if (Platform.OS !== 'web') {
        // Mobile Android - use MWA with simplified transaction
        logger.info('Using MWA for Android');

        // Get blockhash before opening MWA
        const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
        logger.log('Got blockhash:', blockhash);

        const { transact } = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');

        signature = await transact(async (wallet: any) => {
          logger.log('MWA transaction started');

          // Authorize
          await wallet.authorize({
            cluster: config.solanaCluster.replace('solana:', ''),
            identity: {
              name: config.appName || 'Korus',
              uri: config.appUrl || 'https://korus.app',
              icon: 'favicon.ico',
            },
          });

          logger.log('Wallet authorized');

          // Create transaction with transfer and create_game instruction
          const transaction = new Transaction();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = walletPublicKey;

          // Add priority fee
          const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 10000
          });
          transaction.add(priorityFeeIx);

          // Step 1: Transfer SOL to escrow
          const transferIx = SystemProgram.transfer({
            fromPubkey: walletPublicKey,
            toPubkey: escrowPda,
            lamports: wagerLamports,
          });
          transaction.add(transferIx);

          // Step 2: Create the game on-chain
          const discriminator = Buffer.from([124, 69, 75, 66, 184, 220, 72, 206]); // create_game
          const gameTypeBuffer = Buffer.alloc(1);
          gameTypeBuffer.writeUInt8(gameType);
          const wagerBuffer = Buffer.alloc(8);
          wagerBuffer.writeBigUInt64LE(BigInt(wagerLamports));

          const instructionData = Buffer.concat([
            discriminator,
            gameTypeBuffer,
            wagerBuffer
          ]);

          const createGameIx = new TransactionInstruction({
            keys: [
              { pubkey: statePda, isSigner: false, isWritable: true },
              { pubkey: gamePda, isSigner: false, isWritable: true },
              { pubkey: playerStatePda, isSigner: false, isWritable: true },
              { pubkey: escrowPda, isSigner: false, isWritable: true },
              { pubkey: walletPublicKey, isSigner: true, isWritable: true },
              { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: GAME_ESCROW_PROGRAM_ID,
            data: instructionData,
          });
          transaction.add(createGameIx);

          logger.log('Transaction created with transfer and create_game');

          // Sign and send
          const signedTxs = await wallet.signAndSendTransactions({
            transactions: [transaction]
          });

          logger.log('Transaction sent:', signedTxs[0]);
          return signedTxs[0];
        });

        logger.log('Game created successfully on-chain, game ID:', gameId.toString());

      } else {
        // Web browser - use regular wallet adapter
        logger.info('Creating transaction for web wallet');

        if (!walletProvider || !walletProvider.signTransaction) {
          throw new Error('Valid wallet provider required for web transactions');
        }

        // Create transaction
        const transaction = new Transaction();
        const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = walletPublicKey;

        // Add priority fee
        const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 10000
        });
        transaction.add(priorityFeeIx);

        // Step 1: Transfer SOL to escrow
        const transferIx = SystemProgram.transfer({
          fromPubkey: walletPublicKey,
          toPubkey: escrowPda,
          lamports: wagerLamports,
        });
        transaction.add(transferIx);

        // Step 2: Create the game on-chain
        const discriminator = Buffer.from([124, 69, 75, 66, 184, 220, 72, 206]); // create_game
        const gameTypeBuffer = Buffer.alloc(1);
        gameTypeBuffer.writeUInt8(gameType);
        const wagerBuffer = Buffer.alloc(8);
        wagerBuffer.writeBigUInt64LE(BigInt(wagerLamports));

        const instructionData = Buffer.concat([
          discriminator,
          gameTypeBuffer,
          wagerBuffer
        ]);

        const createGameIx = new TransactionInstruction({
          keys: [
            { pubkey: statePda, isSigner: false, isWritable: true },
            { pubkey: gamePda, isSigner: false, isWritable: true },
            { pubkey: playerStatePda, isSigner: false, isWritable: true },
            { pubkey: escrowPda, isSigner: false, isWritable: true },
            { pubkey: walletPublicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          programId: GAME_ESCROW_PROGRAM_ID,
          data: instructionData,
        });
        transaction.add(createGameIx);

        // Sign and send
        const signedTx = await walletProvider.signTransaction(transaction);
        signature = await this.connection.sendRawTransaction(
          signedTx.serialize(),
          {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
          }
        );
      }

      // Wait for confirmation
      logger.info('Waiting for confirmation...');
      await this.connection.confirmTransaction(signature, 'confirmed');
      logger.info('Transaction confirmed:', signature);

      // Return the transaction signature as confirmation
      // The game is now created on-chain with the gameId
      return signature;

    } catch (error: any) {
      logger.error('Failed to create game:', error);

      // Better error messages
      if (error.message?.includes('insufficient')) {
        throw new Error('Insufficient SOL balance for wager and transaction fees');
      } else if (error.message?.includes('cancelled') || error.message?.includes('rejected')) {
        throw new Error('Transaction was cancelled. Please try again.');
      } else if (error.message?.includes('simulation')) {
        throw new Error('Transaction simulation failed. Please try again.');
      }

      throw error;
    }
  }

  /**
   * Join an existing game with direct SOL transfer
   */
  async joinGame(
    gameId: number,
    wagerAmount: number,
    walletProvider: any,
    walletAddress?: string
  ): Promise<string> {
    try {
      const wagerLamports = wagerAmount * LAMPORTS_PER_SOL;

      // Get wallet public key
      let walletPublicKey: PublicKey;

      if (walletAddress) {
        walletPublicKey = new PublicKey(walletAddress);
      } else if (walletProvider?.publicKey) {
        walletPublicKey = new PublicKey(walletProvider.publicKey.toString());
      } else {
        throw new Error('No wallet address provided');
      }

      const gameIdBN = new BN(gameId);
      const [gamePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('game'), gameIdBN.toArrayLike(Buffer, 'le', 8)],
        GAME_ESCROW_PROGRAM_ID
      );

      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), gamePda.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      logger.log('Joining game:', gameId, 'with wager:', wagerAmount, 'SOL');

      // Create transaction for direct transfer
      const transaction = new Transaction();
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletPublicKey;

      // Add priority fee
      const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 10000
      });
      transaction.add(priorityFeeIx);

      // Direct transfer to escrow
      const transferIx = SystemProgram.transfer({
        fromPubkey: walletPublicKey,
        toPubkey: escrowPda,
        lamports: wagerLamports,
      });
      transaction.add(transferIx);

      let signature: string;

      if (Platform.OS !== 'web') {
        // Mobile - use MWA
        const { transact } = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');

        signature = await transact(async (wallet: any) => {
          await wallet.authorize({
            cluster: config.solanaCluster.replace('solana:', ''),
            identity: {
              name: config.appName || 'Korus',
              uri: config.appUrl || 'https://korus.app',
              icon: 'favicon.ico',
            },
          });

          const signedTxs = await wallet.signAndSendTransactions({
            transactions: [transaction]
          });

          return signedTxs[0];
        });
      } else {
        // Web
        if (!walletProvider?.signTransaction) {
          throw new Error('Wallet provider required for web transactions');
        }

        const signedTx = await walletProvider.signTransaction(transaction);
        signature = await this.connection.sendRawTransaction(
          signedTx.serialize(),
          {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
          }
        );
      }

      await this.connection.confirmTransaction(signature, 'confirmed');
      logger.info('Successfully joined game:', gameId);

      return signature;

    } catch (error: any) {
      logger.error('Failed to join game:', error);
      throw error;
    }
  }

  /**
   * Get escrow balance for a game
   */
  async getEscrowBalance(gameId: number): Promise<number> {
    try {
      const gameIdBN = new BN(gameId);
      const [gamePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('game'), gameIdBN.toArrayLike(Buffer, 'le', 8)],
        GAME_ESCROW_PROGRAM_ID
      );

      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), gamePda.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      const balance = await this.connection.getBalance(escrowPda);
      return balance / LAMPORTS_PER_SOL;

    } catch (error) {
      logger.error('Failed to get escrow balance:', error);
      return 0;
    }
  }

  /**
   * Check if a player can join games (simplified)
   */
  async canPlayerJoin(walletAddress: string): Promise<boolean> {
    // For now, always return true since we're not tracking on-chain state
    // In production, this would check the player's state account
    return true;
  }

  /**
   * Get game state (placeholder for now)
   */
  async getGameState(gameId: number): Promise<GameState | null> {
    // This is a placeholder - in production, parse on-chain data
    return null;
  }

  /**
   * Cancel game (placeholder - requires contract integration)
   */
  async cancelGame(gameId: number, wallet: any): Promise<string | null> {
    logger.warn('cancelGame not yet implemented in direct service');
    // In production, this would interact with the contract
    // For now, we can't cancel without contract support
    throw new Error('Game cancellation requires contract update');
  }

  /**
   * Update move time (placeholder - requires contract integration)
   */
  async updateMoveTime(gameId: number, wallet: any): Promise<string | null> {
    logger.warn('updateMoveTime not yet implemented in direct service');
    // This would be handled by the contract
    return null;
  }
}

export const gameEscrowService = new GameEscrowDirectService();