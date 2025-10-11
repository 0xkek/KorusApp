/**
 * Game Escrow Hook
 * Handles blockchain interactions for the game escrow smart contract
 */

import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { useCallback, useState } from 'react';

// Contract configuration
// Deployed program ID on devnet
const GAME_ESCROW_PROGRAM_ID = new PublicKey('4iUdAkPRmZLzUFXTLpt5QPGmUUtP6yfgpPpF3sLD9xtd');
const TREASURY_WALLET = new PublicKey('ByqqYGErKfyLHHd3NjgMnbbxQdPs1kFrPVWPUHUsD31W');

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
      console.error('Failed to get next game ID:', error);
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
      console.log('='.repeat(50));
      console.log('🎮 CREATE GAME STARTED');
      console.log('Wallet:', publicKey.toString());
      console.log('Game Type:', gameType);
      console.log('Wager (lamports):', wagerLamports);
      console.log('='.repeat(50));

      // Get the next game ID
      const gameId = await getNextGameId();
      console.log('Next Game ID:', gameId);

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
        [Buffer.from('player'), publicKey.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), gamePda.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      console.log('Derived PDAs:', {
        wallet: publicKey.toString(),
        statePda: statePda.toString(),
        gamePda: gamePda.toString(),
        playerStatePda: playerStatePda.toString(),
        escrowPda: escrowPda.toString(),
        gameId,
      });

      // Check if player state already exists
      const existingPlayerState = await connection.getAccountInfo(playerStatePda);
      if (existingPlayerState) {
        console.log('⚠️ Player state already exists!');
        const hasActiveGame = existingPlayerState.data.readUInt8(40) === 1;
        console.log('  has_active_game:', hasActiveGame);
        if (hasActiveGame && existingPlayerState.data.length > 41 && existingPlayerState.data.readUInt8(41) === 1) {
          const currentGameId = Number(existingPlayerState.data.readBigUInt64LE(42));
          console.log('  current_game_id:', currentGameId);

          // Player has an active game - show error
          throw new Error(
            `You already have an active game (Game ID: ${currentGameId}). ` +
            `Please complete or cancel that game before creating a new one. ` +
            `You can cancel it manually using the cancel button on the game card.`
          );
        }
      } else {
        console.log('✅ No existing player state - will be created');
      }

      // Build transaction manually without Anchor Program helper

      // First, create a transfer instruction to deposit wager into escrow
      const transferIx = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: escrowPda,
        lamports: wagerLamports,
      });

      // Then create the create_game_with_deposit instruction
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
      })
        .add(transferIx)  // First deposit to escrow
        .add(createGameIx); // Then create game

      // Simulate transaction first to get better error messages
      try {
        const simulation = await connection.simulateTransaction(tx);
        console.log('Simulation logs:', simulation.value.logs);
        if (simulation.value.err) {
          console.error('Simulation failed:', simulation.value);
          console.error('Full simulation:', JSON.stringify(simulation.value, null, 2));
          throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
        }
        console.log('Simulation succeeded!');
      } catch (simError: any) {
        console.error('Simulation error:', simError);
        throw simError;
      }

      // Send transaction
      let signature: string;
      try {
        signature = await sendTransaction(tx, connection);
      } catch (txError: any) {
        console.error('Transaction failed:', txError);
        console.error('Error details:', {
          message: txError.message,
          logs: txError.logs,
          error: txError.error,
        });
        throw new Error(txError.message || 'Transaction failed');
      }

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('✅ Game created on blockchain:', { gameId, signature });

      setIsProcessing(false);
      return { gameId, signature };
    } catch (error) {
      console.error('Failed to create game on blockchain:', error);
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
      // Derive PDAs
      const gameIdBuffer = Buffer.alloc(8);
      gameIdBuffer.writeBigUInt64LE(BigInt(gameId));
      const [gamePda] = await PublicKey.findProgramAddress(
        [Buffer.from('game'), gameIdBuffer],
        GAME_ESCROW_PROGRAM_ID
      );

      const [playerStatePda] = await PublicKey.findProgramAddress(
        [Buffer.from('player'), publicKey.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      const [escrowPda] = await PublicKey.findProgramAddress(
        [Buffer.from('escrow'), gamePda.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      // Create the instruction
      if (!anchorWallet) {
        throw new Error('Wallet not connected');
      }

      const provider = new anchor.AnchorProvider(
        connection,
        anchorWallet,
        { commitment: 'confirmed' }
      );
      const program = new anchor.Program(IDL as any, GAME_ESCROW_PROGRAM_ID, provider);

      const tx = await program.methods
        .joinGame()
        .accounts({
          game: gamePda,
          playerState: playerStatePda,
          escrow: escrowPda,
          player: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      // Send transaction
      const signature = await sendTransaction(tx, connection);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('✅ Joined game on blockchain:', { gameId, signature });

      setIsProcessing(false);
      return { signature };
    } catch (error) {
      console.error('Failed to join game on blockchain:', error);
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
      console.log('🚫 Cancelling game:', gameId);

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
        [Buffer.from('player'), publicKey.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), gamePda.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      // Create cancel_game instruction
      // SHA256("global:cancel_game")[:8]
      const discriminator = Buffer.from([121, 194, 154, 118, 103, 235, 149, 52]);

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
        console.log('Cancel game simulation logs:', simulation.value.logs);
        if (simulation.value.err) {
          console.error('Cancel simulation failed:', simulation.value);
          throw new Error(`Cancel simulation failed: ${JSON.stringify(simulation.value.err)}`);
        }
      } catch (simError: any) {
        console.error('Cancel simulation error:', simError);
        throw simError;
      }

      // Send transaction
      const signature = await sendTransaction(tx, connection);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('✅ Game cancelled on blockchain:', { gameId, signature });

      setIsProcessing(false);
      return signature;
    } catch (error) {
      console.error('Failed to cancel game on blockchain:', error);
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
