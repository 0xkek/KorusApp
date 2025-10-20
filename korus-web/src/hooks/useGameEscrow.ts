/**
 * Game Escrow Hook
 * Handles blockchain interactions for the game escrow smart contract
 */

import { logger } from '@/utils/logger';
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction, TransactionInstruction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { useCallback, useState } from 'react';

// Contract configuration
// Load from environment variables for flexibility across deployments
const GAME_ESCROW_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_GAME_ESCROW_PROGRAM_ID || '4iUdAkPRmZLzUFXTLpt5QPGmUUtP6yfgpPpF3sLD9xtd'
);
const TREASURY_WALLET = new PublicKey(
  process.env.NEXT_PUBLIC_TREASURY_WALLET || 'ByqqYGErKfyLHHd3NjgMnbbxQdPs1kFrPVWPUHUsD31W'
);

// Minimal IDL for client-side interactions
const IDL = {
  version: "0.1.0",
  name: "korus_game_escrow",
  instructions: [
    {
      name: "createGame",
      accounts: [
        { name: "state", isMut: true, isSigner: false },
        { name: "game", isMut: true, isSigner: false },
        { name: "playerState", isMut: true, isSigner: false },
        { name: "escrow", isMut: true, isSigner: false },
        { name: "player", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "gameType", type: "u8" },
        { name: "wagerAmount", type: "u64" }
      ]
    },
    {
      name: "joinGame",
      accounts: [
        { name: "game", isMut: true, isSigner: false },
        { name: "playerState", isMut: true, isSigner: false },
        { name: "escrow", isMut: true, isSigner: false },
        { name: "player", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: []
    }
  ]
};

export type GameType = 'tictactoe' | 'rps' | 'connectfour';

interface CreateGameResult {
  gameId: number;
  signature: string;
}

interface JoinGameResult {
  signature: string;
}

export function useGameEscrow() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const anchorWallet = useAnchorWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get the next available game ID from the blockchain
   */
  const getNextGameId = useCallback(async (): Promise<number> => {
    try {
      const [statePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('state')],
        GAME_ESCROW_PROGRAM_ID
      );

      const stateAccount = await connection.getAccountInfo(statePda);
      if (!stateAccount) {
        throw new Error('Contract state not found');
      }

      // State layout: discriminator(8) + authority(32) + treasury(32) + total_games(8) + ...
      const totalGames = stateAccount.data.readBigUInt64LE(72);
      return Number(totalGames);
    } catch (error) {
      logger.error('Failed to get next game ID:', error);
      throw error;
    }
  }, [connection]);

  /**
   * Create a new game on the blockchain with escrow deposit
   */
  const createGame = useCallback(async (
    gameType: GameType,
    wagerLamports: number
  ): Promise<CreateGameResult> => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsProcessing(true);
    setError(null);

    try {
      logger.log('='.repeat(50));
      logger.log('🎮 CREATE GAME STARTED');
      logger.log('Wallet:', publicKey.toString());
      logger.log('Game Type:', gameType);
      logger.log('Wager (lamports):', wagerLamports);
      logger.log('='.repeat(50));

      // Get the next game ID
      const gameId = await getNextGameId();
      logger.log('Next Game ID:', gameId);

      // Convert game type to u8
      const gameTypeMap: Record<GameType, number> = {
        tictactoe: 0,
        rps: 1,
        connectfour: 2
      };
      const gameTypeValue = gameTypeMap[gameType];

      // Derive PDAs
      const [statePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('state')],
        GAME_ESCROW_PROGRAM_ID
      );

      const gameIdBuffer = Buffer.alloc(8);
      gameIdBuffer.writeBigUInt64LE(BigInt(gameId));
      const [gamePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('game'), gameIdBuffer],
        GAME_ESCROW_PROGRAM_ID
      );

      const [playerStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('player_game_state'), publicKey.toBuffer(), gameIdBuffer],
        GAME_ESCROW_PROGRAM_ID
      );

      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), gamePda.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      logger.log('Derived PDAs:', {
        wallet: publicKey.toString(),
        statePda: statePda.toString(),
        gamePda: gamePda.toString(),
        playerStatePda: playerStatePda.toString(),
        escrowPda: escrowPda.toString(),
        gameId,
      });

      // Check if player state already exists (no longer checking has_active_game - multiple games allowed)
      const existingPlayerState = await connection.getAccountInfo(playerStatePda);
      if (existingPlayerState) {
        logger.log('✅ Player state exists - multiple games allowed');
      } else {
        logger.log('✅ No existing player state - will be created');
      }

      // Build transaction manually without Anchor Program helper
      // NOTE: The smart contract handles the SOL transfer via CPI after initializing accounts
      // This ensures the player has enough SOL for rent before transferring the wager

      // Create the create_game_with_deposit instruction
      // Instruction discriminator: SHA256("global:create_game_with_deposit")[:8]
      const discriminator = Buffer.from([128, 144, 19, 1, 81, 102, 47, 103]);

      // Encode game_type (u8) and wager_amount (u64, little-endian)
      const gameTypeBuffer = Buffer.alloc(1);
      gameTypeBuffer.writeUInt8(gameTypeValue, 0);

      const wagerBuffer = Buffer.alloc(8);
      wagerBuffer.writeBigUInt64LE(BigInt(wagerLamports), 0);

      const instructionData = Buffer.concat([discriminator, gameTypeBuffer, wagerBuffer]);

      // Build the instruction
      const createGameIx = new TransactionInstruction({
        programId: GAME_ESCROW_PROGRAM_ID,
        keys: [
          { pubkey: statePda, isSigner: false, isWritable: true },
          { pubkey: gamePda, isSigner: false, isWritable: true },
          { pubkey: playerStatePda, isSigner: false, isWritable: true },
          { pubkey: escrowPda, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: instructionData,
      });

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

      const tx = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      }).add(createGameIx); // Contract handles SOL transfer via CPI

      // Simulate transaction first to get better error messages
      try {
        const simulation = await connection.simulateTransaction(tx);
        logger.log('Simulation logs:', simulation.value.logs);
        if (simulation.value.err) {
          logger.error('Simulation failed:', simulation.value);
          logger.error('Full simulation:', JSON.stringify(simulation.value, null, 2));

          // Check for insufficient funds error (Custom error 1)
          const errStr = JSON.stringify(simulation.value.err);
          if (errStr.includes('"Custom":1')) {
            const balance = await connection.getBalance(publicKey);
            const requiredSOL = (wagerLamports + 5000 + 5000) / LAMPORTS_PER_SOL; // wager + tx fee + rent
            const currentSOL = balance / LAMPORTS_PER_SOL;
            throw new Error(`Insufficient funds. You need at least ${requiredSOL.toFixed(4)} SOL but only have ${currentSOL.toFixed(4)} SOL. Please add more SOL to your wallet.`);
          }

          throw new Error(`Simulation failed: ${errStr}`);
        }
        logger.log('Simulation succeeded!');
      } catch (simError: unknown) {
        logger.error('Simulation error:', simError);
        throw simError;
      }

      // Send transaction
      let signature: string;
      try {
        signature = await sendTransaction(tx, connection);
      } catch (txError: unknown) {
        logger.error('Transaction failed:', txError);

        // Check if user rejected the transaction
        const errorMessage = txError instanceof Error ? txError.message : 'Transaction failed';
        const isUserRejection = errorMessage.includes('closed') ||
                                errorMessage.includes('rejected') ||
                                errorMessage.includes('cancelled') ||
                                errorMessage.includes('User rejected');

        if (isUserRejection) {
          throw new Error('Transaction cancelled by user');
        }

        logger.error('Error details:', txError);
        throw new Error(errorMessage);
      }

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      logger.log('✅ Game created on blockchain:', { gameId, signature });

      setIsProcessing(false);
      return { gameId, signature };
    } catch (error) {
      logger.error('Failed to create game on blockchain:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create game';
      setError(errorMessage);
      setIsProcessing(false);
      throw error;
    }
  }, [publicKey, connection, sendTransaction, getNextGameId]);

  /**
   * Join an existing game with escrow deposit
   */
  const joinGame = useCallback(async (gameId: number): Promise<JoinGameResult> => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsProcessing(true);
    setError(null);

    try {
      logger.log('='.repeat(50));
      logger.log('🎮 JOIN GAME STARTED');
      logger.log('Wallet:', publicKey.toString());
      logger.log('Game ID:', gameId);
      logger.log('='.repeat(50));

      // First, get the game from blockchain to know the wager amount
      const gameIdBuffer = Buffer.alloc(8);
      gameIdBuffer.writeBigUInt64LE(BigInt(gameId));
      const [gamePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('game'), gameIdBuffer],
        GAME_ESCROW_PROGRAM_ID
      );

      const [playerStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('player_game_state'), publicKey.toBuffer(), gameIdBuffer],
        GAME_ESCROW_PROGRAM_ID
      );

      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), gamePda.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      const [statePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('state')],
        GAME_ESCROW_PROGRAM_ID
      );

      logger.log('Derived PDAs:', {
        gamePda: gamePda.toString(),
        playerStatePda: playerStatePda.toString(),
        escrowPda: escrowPda.toString(),
        statePda: statePda.toString(),
      });

      // Check if player state exists (for informational purposes only - blockchain allows multiple games)
      const playerStateAccount = await connection.getAccountInfo(playerStatePda);
      if (playerStateAccount) {
        logger.log('✅ Player state exists - user can join multiple games');
      } else {
        logger.log('Player state does not exist yet (will be created with init_if_needed)');
      }

      // Get game account to read wager
      const gameAccount = await connection.getAccountInfo(gamePda);
      if (!gameAccount) {
        throw new Error('Game not found on blockchain');
      }

      // Read wager from game account (discriminator(8) + game_id(8) + game_type(1) + player1(32) + player2_option(1+32) + wager(8))
      const wagerOffset = 8 + 8 + 1 + 32 + 1 + 32;
      const wagerLamports = Number(gameAccount.data.readBigUInt64LE(wagerOffset));
      logger.log('Game wager:', wagerLamports, 'lamports');

      // Build join_game instruction
      // NOTE: The smart contract itself does the transfer via CPI, so we don't need a separate transfer instruction
      // Instruction discriminator: SHA256("global:join_game")[:8]
      const discriminator = Buffer.from([107, 112, 18, 38, 56, 173, 60, 128]);

      const joinGameIx = new TransactionInstruction({
        programId: GAME_ESCROW_PROGRAM_ID,
        keys: [
          { pubkey: statePda, isSigner: false, isWritable: true },
          { pubkey: gamePda, isSigner: false, isWritable: true },
          { pubkey: playerStatePda, isSigner: false, isWritable: true },
          { pubkey: escrowPda, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: discriminator,
      });

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

      const tx = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      }).add(joinGameIx);  // Join game (smart contract handles the transfer)

      // Simulate first
      try {
        const simulation = await connection.simulateTransaction(tx);
        logger.log('='.repeat(50));
        logger.log('SIMULATION RESULT:');
        logger.log('Logs:', simulation.value.logs);
        logger.log('Error:', simulation.value.err);
        logger.log('Units consumed:', simulation.value.unitsConsumed);
        logger.log('='.repeat(50));

        if (simulation.value.err) {
          logger.error('Simulation failed:', simulation.value);

          // Parse the error to provide better context
          const errStr = JSON.stringify(simulation.value.err);

          // Check for insufficient funds error (Custom error 1)
          if (errStr.includes('"Custom":1')) {
            const balance = await connection.getBalance(publicKey);
            const requiredSOL = (wagerLamports + 5000 + 5000) / LAMPORTS_PER_SOL; // wager + tx fee + rent
            const currentSOL = balance / LAMPORTS_PER_SOL;
            throw new Error(`Insufficient funds. You need at least ${requiredSOL.toFixed(4)} SOL but only have ${currentSOL.toFixed(4)} SOL. Please add more SOL to your wallet.`);
          }

          if (errStr.includes('101')) {
            logger.error('Error 101: This might be PlayerAlreadyInGame error');
            logger.error('Check if the player_state account has current_game_id set');
          }

          throw new Error(`Simulation failed: ${errStr}`);
        }
        logger.log('Simulation succeeded!');
      } catch (simError: unknown) {
        logger.error('Simulation error:', simError);
        throw simError;
      }

      // Send transaction
      let signature: string;
      try {
        signature = await sendTransaction(tx, connection);
      } catch (txError: unknown) {
        logger.error('Transaction failed:', txError);

        // Check if user rejected the transaction
        const errorMessage = txError instanceof Error ? txError.message : 'Transaction failed';
        const isUserRejection = errorMessage.includes('closed') ||
                                errorMessage.includes('rejected') ||
                                errorMessage.includes('cancelled') ||
                                errorMessage.includes('User rejected');

        if (isUserRejection) {
          throw new Error('Transaction cancelled by user');
        }

        logger.error('Error details:', txError);
        throw new Error(errorMessage);
      }

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      logger.log('✅ Joined game on blockchain:', { gameId, signature });

      setIsProcessing(false);
      return { signature };
    } catch (error) {
      logger.error('Failed to join game on blockchain:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to join game';
      setError(errorMessage);
      setIsProcessing(false);
      throw error;
    }
  }, [publicKey, connection, sendTransaction]);

  /**
   * Cancel an existing game
   */
  const cancelGame = useCallback(async (gameId: number): Promise<string> => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsProcessing(true);
    setError(null);

    try {
      logger.log('🚫 Cancelling game:', gameId);

      // Derive PDAs
      const [statePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('state')],
        GAME_ESCROW_PROGRAM_ID
      );

      const gameIdBuffer = Buffer.alloc(8);
      gameIdBuffer.writeBigUInt64LE(BigInt(gameId));
      const [gamePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('game'), gameIdBuffer],
        GAME_ESCROW_PROGRAM_ID
      );

      const [playerStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('player_game_state'), publicKey.toBuffer(), gameIdBuffer],
        GAME_ESCROW_PROGRAM_ID
      );

      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), gamePda.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      // Create cancel_game instruction
      // SHA256("global:cancel_game")[:8]
      const discriminator = Buffer.from([0x79, 0xc2, 0x9a, 0x76, 0x67, 0xeb, 0x95, 0x34]);

      const cancelGameIx = new TransactionInstruction({
        programId: GAME_ESCROW_PROGRAM_ID,
        keys: [
          { pubkey: statePda, isSigner: false, isWritable: true },
          { pubkey: gamePda, isSigner: false, isWritable: true },
          { pubkey: playerStatePda, isSigner: false, isWritable: true },
          { pubkey: escrowPda, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: discriminator,
      });

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

      const tx = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      }).add(cancelGameIx);

      // Simulate first to get better error messages
      try {
        const simulation = await connection.simulateTransaction(tx);
        logger.log('='.repeat(50));
        logger.log('CANCEL GAME SIMULATION:');
        logger.log('Logs:', simulation.value.logs);
        logger.log('Error:', simulation.value.err);
        logger.log('Units consumed:', simulation.value.unitsConsumed);
        logger.log('Accounts:', JSON.stringify({
          statePda: statePda.toString(),
          gamePda: gamePda.toString(),
          playerStatePda: playerStatePda.toString(),
          escrowPda: escrowPda.toString(),
          player1: publicKey.toString(),
        }, null, 2));
        logger.log('='.repeat(50));
        if (simulation.value.err) {
          logger.error('Cancel simulation failed:', simulation.value);
          logger.error('Error details:', JSON.stringify(simulation.value.err, null, 2));

          // Check account existence
          const [gameAccountInfo, playerStateInfo, escrowInfo] = await Promise.all([
            connection.getAccountInfo(gamePda),
            connection.getAccountInfo(playerStatePda),
            connection.getAccountInfo(escrowPda)
          ]);

          logger.log('Account existence check:');
          logger.log('- Game account exists:', !!gameAccountInfo);
          logger.log('- Player state exists:', !!playerStateInfo);
          logger.log('- Escrow exists:', !!escrowInfo);

          if (gameAccountInfo) {
            logger.log('- Game account owner:', gameAccountInfo.owner.toString());
            logger.log('- Game account data length:', gameAccountInfo.data.length);
          }
          if (playerStateInfo) {
            logger.log('- Player state owner:', playerStateInfo.owner.toString());
            logger.log('- Player state data length:', playerStateInfo.data.length);
          }

          throw new Error(`Cancel simulation failed: ${JSON.stringify(simulation.value.err)}`);
        }
      } catch (simError: unknown) {
        logger.error('Cancel simulation error:', simError);
        throw simError;
      }

      // Send transaction
      const signature = await sendTransaction(tx, connection);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      logger.log('✅ Game cancelled on blockchain:', { gameId, signature });

      setIsProcessing(false);
      return signature;
    } catch (error) {
      logger.error('Failed to cancel game on blockchain:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel game';
      setError(errorMessage);
      setIsProcessing(false);
      throw error;
    }
  }, [publicKey, connection, sendTransaction]);

  return {
    createGame,
    joinGame,
    cancelGame,
    getNextGameId,
    isProcessing,
    error,
  };
}
