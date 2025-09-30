import '../structuredClonePolyfill';
import { PublicKey, Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL, TransactionInstruction, ComputeBudgetProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { config } from '../../config/environment';
import { logger } from '../logger';
import { Platform } from 'react-native';

// Program ID - Deployed to Solana Devnet
export const GAME_ESCROW_PROGRAM_ID = new PublicKey('9jsNDSzvsRHH8KUhFwLdEeEKL6nTWhx4YgzmdkhEh1Te');

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

export class GameEscrowCompleteService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(config.solanaRpcUrl, 'confirmed');
  }

  /**
   * Create a new game - Step 1: Transfer wager, Step 2: Call create_game
   */
  async createGame(
    gameType: number,
    wagerAmount: number,
    walletProvider: any,
    walletAddress?: string
  ): Promise<{ signature: string; gameId: number }> {
    try {
      const wagerLamports = wagerAmount * LAMPORTS_PER_SOL;
      if (wagerLamports < MINIMUM_WAGER || wagerLamports > MAXIMUM_WAGER) {
        throw new Error(`Wager must be between 0.01 and 1 SOL`);
      }

      // Get wallet public key
      let walletPublicKey: PublicKey;
      if (walletAddress) {
        walletPublicKey = new PublicKey(walletAddress);
      } else if (walletProvider?.publicKey) {
        walletPublicKey = new PublicKey(walletProvider.publicKey.toString());
      } else {
        throw new Error('No wallet address provided');
      }

      logger.log('Creating game with wallet:', walletPublicKey.toString());

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
        gamePda: gamePda.toBase58(),
        playerStatePda: playerStatePda.toBase58(),
        escrowPda: escrowPda.toBase58()
      });

      // Create transaction with both transfer and create_game instruction
      logger.log('Creating transaction...');
      const transaction = new Transaction();
      logger.log('Getting latest blockhash...');
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
      logger.log('Got blockhash:', { blockhash, lastValidBlockHeight });
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletPublicKey;
      logger.log('Transaction initialized with', transaction.instructions.length, 'instructions');

      // Add compute budget instructions
      const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: 300000
      });
      const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 10000
      });
      transaction.add(modifyComputeUnits);
      transaction.add(priorityFeeIx);

      // Step 1: Transfer SOL to escrow
      const transferIx = SystemProgram.transfer({
        fromPubkey: walletPublicKey,
        toPubkey: escrowPda,
        lamports: wagerLamports,
      });
      transaction.add(transferIx);
      logger.log('Added transfer instruction');

      // Step 2: Create the game on-chain
      // Build create_game instruction (since we already transferred the SOL)
      logger.log('Building create_game instruction...');
      const discriminator = Buffer.from([124, 69, 75, 66, 184, 220, 72, 206]); // create_game discriminator
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
      logger.log('Transaction built with', transaction.instructions.length, 'instructions');
      logger.log('Total estimated SOL needed:', (wagerLamports / LAMPORTS_PER_SOL + 0.001).toFixed(4), 'SOL');

      // Sign and send
      let signature: string;

      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        // Mobile - use MWA
        logger.log('Using MWA to sign transaction...');
        logger.log('Platform:', Platform.OS);
        const { transact } = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');

        signature = await transact(async (wallet: any) => {
          logger.log('MWA transact callback started');

          try {
            logger.log('Calling wallet.authorize...');
            const authResult = await wallet.authorize({
              cluster: 'solana:devnet',
              identity: {
                name: config.appName || 'Korus',
                uri: config.appUrl || 'https://korus.app',
                icon: 'favicon.ico',
              },
            });
            logger.log('Authorization result:', JSON.stringify(authResult));
          } catch (authError: any) {
            logger.error('Authorization error:', authError);
            throw new Error(`Authorization failed: ${authError.message}`);
          }

          logger.log('Wallet authorized, sending transaction...');

          try {
            logger.log('Calling wallet.signAndSendTransactions...');
            const signedTxs = await wallet.signAndSendTransactions({
              transactions: [transaction]
            });
            logger.log('Transaction signed and sent, signature:', signedTxs[0]);
            return signedTxs[0];
          } catch (txError: any) {
            logger.error('Transaction signing error:', txError);
            throw new Error(`Transaction signing failed: ${txError.message}`);
          }
        });
      } else {
        // Web
        if (!walletProvider?.signTransaction) {
          throw new Error('Wallet provider required');
        }

        const signedTx = await walletProvider.signTransaction(transaction);
        signature = await this.connection.sendRawTransaction(
          signedTx.serialize(),
          { skipPreflight: false, preflightCommitment: 'confirmed' }
        );
      }

      await this.connection.confirmTransaction(signature, 'confirmed');
      logger.info('Game created successfully on-chain:', signature);
      logger.info('Game ID:', gameId.toString());
      logger.info('Transaction signature:', signature);

      // Return both the signature and the on-chain game ID
      return {
        signature,
        gameId: gameId.toNumber()
      };

    } catch (error: any) {
      logger.error('Failed to create game:', error);

      // Provide more detailed error messages
      if (error.message?.includes('User rejected') || error.message?.includes('User declined')) {
        throw new Error('Transaction was cancelled by user');
      } else if (error.message?.includes('insufficient funds') || error.message?.includes('insufficient lamports')) {
        throw new Error('Insufficient SOL balance for this transaction');
      } else if (error.message?.includes('0x1')) {
        throw new Error('Insufficient funds for rent exemption and transaction fee');
      } else if (error.message?.includes('blockhash')) {
        throw new Error('Transaction expired. Please try again');
      } else if (error.message?.includes('simulation failed')) {
        throw new Error('Transaction simulation failed. Please check your balance and try again');
      }

      throw error;
    }
  }

  /**
   * Cancel a game and get refund
   */
  async cancelGame(
    gameId: number,
    walletProvider: any,
    walletAddress?: string
  ): Promise<string> {
    try {
      let walletPublicKey: PublicKey;
      if (walletAddress) {
        walletPublicKey = new PublicKey(walletAddress);
      } else if (walletProvider?.publicKey) {
        walletPublicKey = new PublicKey(walletProvider.publicKey.toString());
      } else {
        throw new Error('No wallet address provided');
      }

      const gameIdBN = new BN(gameId);

      // Get PDAs
      const [statePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('state')],
        GAME_ESCROW_PROGRAM_ID
      );

      const [gamePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('game'), gameIdBN.toArrayLike(Buffer, 'le', 8)],
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

      // Build cancel instruction
      const discriminator = Buffer.from([121, 194, 154, 118, 103, 235, 149, 52]); // cancel_game discriminator

      const cancelGameIx = new TransactionInstruction({
        keys: [
          { pubkey: statePda, isSigner: false, isWritable: true },
          { pubkey: gamePda, isSigner: false, isWritable: true },
          { pubkey: playerStatePda, isSigner: false, isWritable: true },
          { pubkey: escrowPda, isSigner: false, isWritable: true },
          { pubkey: walletPublicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: GAME_ESCROW_PROGRAM_ID,
        data: discriminator,
      });

      const transaction = new Transaction();
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletPublicKey;
      transaction.add(cancelGameIx);

      let signature: string;

      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        // Mobile - use MWA
        const { transact } = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');

        signature = await transact(async (wallet: any) => {
          await wallet.authorize({
            cluster: 'solana:devnet',
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
          throw new Error('Wallet provider required');
        }

        const signedTx = await walletProvider.signTransaction(transaction);
        signature = await this.connection.sendRawTransaction(
          signedTx.serialize(),
          { skipPreflight: false, preflightCommitment: 'confirmed' }
        );
      }

      await this.connection.confirmTransaction(signature, 'confirmed');
      logger.info('Game cancelled successfully, refund processed');

      return signature;

    } catch (error: any) {
      logger.error('Failed to cancel game:', error);

      // Provide more detailed error messages
      if (error.message?.includes('User rejected') || error.message?.includes('User declined')) {
        throw new Error('Transaction was cancelled by user');
      } else if (error.message?.includes('not the creator')) {
        throw new Error('Only the game creator can cancel the game');
      } else if (error.message?.includes('already started') || error.message?.includes('already active')) {
        throw new Error('Cannot cancel a game that has already started');
      }

      throw error;
    }
  }

  /**
   * Join game with wager
   */
  async joinGame(
    gameId: number,
    wagerAmount: number,
    walletProvider: any,
    walletAddress?: string
  ): Promise<string> {
    try {
      const wagerLamports = wagerAmount * LAMPORTS_PER_SOL;

      let walletPublicKey: PublicKey;
      if (walletAddress) {
        walletPublicKey = new PublicKey(walletAddress);
      } else if (walletProvider?.publicKey) {
        walletPublicKey = new PublicKey(walletProvider.publicKey.toString());
      } else {
        throw new Error('No wallet address provided');
      }

      const gameIdBN = new BN(gameId);

      // Get PDAs
      const [statePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('state')],
        GAME_ESCROW_PROGRAM_ID
      );

      const [gamePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('game'), gameIdBN.toArrayLike(Buffer, 'le', 8)],
        GAME_ESCROW_PROGRAM_ID
      );

      const [player2StatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('player'), walletPublicKey.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), gamePda.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      // Create transaction - only transfer, no join_game instruction
      const transaction = new Transaction();
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletPublicKey;

      // Add compute budget instructions
      const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: 300000
      });
      const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 10000
      });
      transaction.add(modifyComputeUnits);
      transaction.add(priorityFeeIx);

      // Only transfer wager to escrow (no join_game instruction)
      const transferIx = SystemProgram.transfer({
        fromPubkey: walletPublicKey,
        toPubkey: escrowPda,
        lamports: wagerLamports,
      });
      transaction.add(transferIx);

      let signature: string;

      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        // Mobile - use MWA
        const { transact } = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');

        signature = await transact(async (wallet: any) => {
          await wallet.authorize({
            cluster: 'solana:devnet',
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
          throw new Error('Wallet provider required');
        }

        const signedTx = await walletProvider.signTransaction(transaction);
        signature = await this.connection.sendRawTransaction(
          signedTx.serialize(),
          { skipPreflight: false, preflightCommitment: 'confirmed' }
        );
      }

      await this.connection.confirmTransaction(signature, 'confirmed');
      logger.info('Successfully joined game:', gameId);

      return signature;

    } catch (error: any) {
      logger.error('Failed to join game:', error);

      // Provide more detailed error messages
      if (error.message?.includes('User rejected') || error.message?.includes('User declined')) {
        throw new Error('Transaction was cancelled by user');
      } else if (error.message?.includes('insufficient funds') || error.message?.includes('insufficient lamports')) {
        throw new Error('Insufficient SOL balance to join this game');
      } else if (error.message?.includes('0x1')) {
        throw new Error('Insufficient funds for wager and transaction fee');
      } else if (error.message?.includes('already has an active game')) {
        throw new Error('You already have an active game. Complete it first.');
      }

      throw error;
    }
  }

  /**
   * Claim timeout win (if opponent hasn't moved in 10 minutes)
   */
  async claimTimeoutWin(
    gameId: number,
    walletProvider: any,
    walletAddress?: string
  ): Promise<string> {
    try {
      let walletPublicKey: PublicKey;
      if (walletAddress) {
        walletPublicKey = new PublicKey(walletAddress);
      } else if (walletProvider?.publicKey) {
        walletPublicKey = new PublicKey(walletProvider.publicKey.toString());
      } else {
        throw new Error('No wallet address provided');
      }

      const gameIdBN = new BN(gameId);

      // Get PDAs
      const [statePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('state')],
        GAME_ESCROW_PROGRAM_ID
      );

      const [gamePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('game'), gameIdBN.toArrayLike(Buffer, 'le', 8)],
        GAME_ESCROW_PROGRAM_ID
      );

      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), gamePda.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      // Need both player PDAs for the instruction
      // You'll need to get player addresses from the game state
      // For now, using placeholders
      const player1 = walletPublicKey; // This should come from game state
      const player2 = walletPublicKey; // This should come from game state

      const [player1StatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('player'), player1.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      const [player2StatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('player'), player2.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      const [treasuryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('treasury')],
        GAME_ESCROW_PROGRAM_ID
      );

      // Build claim timeout instruction
      const discriminator = Buffer.from([87, 130, 15, 158, 52, 108, 1, 173]); // claim_timeout_win

      const claimTimeoutIx = new TransactionInstruction({
        keys: [
          { pubkey: statePda, isSigner: false, isWritable: true },
          { pubkey: gamePda, isSigner: false, isWritable: true },
          { pubkey: escrowPda, isSigner: false, isWritable: true },
          { pubkey: walletPublicKey, isSigner: true, isWritable: false },
          { pubkey: player1, isSigner: false, isWritable: true },
          { pubkey: player2, isSigner: false, isWritable: true },
          { pubkey: player1StatePda, isSigner: false, isWritable: true },
          { pubkey: player2StatePda, isSigner: false, isWritable: true },
          { pubkey: treasuryPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: GAME_ESCROW_PROGRAM_ID,
        data: discriminator,
      });

      const transaction = new Transaction();
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletPublicKey;
      transaction.add(claimTimeoutIx);

      let signature: string;

      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        // Mobile - use MWA
        const { transact } = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');

        signature = await transact(async (wallet: any) => {
          await wallet.authorize({
            cluster: 'solana:devnet',
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
          throw new Error('Wallet provider required');
        }

        const signedTx = await walletProvider.signTransaction(transaction);
        signature = await this.connection.sendRawTransaction(
          signedTx.serialize(),
          { skipPreflight: false, preflightCommitment: 'confirmed' }
        );
      }

      await this.connection.confirmTransaction(signature, 'confirmed');
      logger.info('Timeout claimed successfully');

      return signature;

    } catch (error: any) {
      logger.error('Failed to claim timeout:', error);
      throw error;
    }
  }

  /**
   * Check if player can join games
   */
  async canPlayerJoin(walletAddress: string): Promise<boolean> {
    // For now, return true
    // In production, check player state account
    return true;
  }

  /**
   * Get game state
   */
  async getGameState(gameId: number): Promise<GameState | null> {
    // Placeholder for now
    return null;
  }
}

export const gameEscrowService = new GameEscrowCompleteService();