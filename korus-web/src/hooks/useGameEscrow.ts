/**
 * Game Escrow Hook
 * Handles blockchain interactions for the game escrow smart contract
 * Uses /api/rpc proxy to avoid 403 errors from direct RPC calls
 */

import { logger } from '@/utils/logger';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction, TransactionInstruction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useCallback, useState } from 'react';

// Contract configuration
const GAME_ESCROW_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_GAME_ESCROW_PROGRAM_ID || '4iUdAkPRmZLzUFXTLpt5QPGmUUtP6yfgpPpF3sLD9xtd'
);

// Helper to call RPC via server-side proxy (uses correct mainnet endpoint)
async function rpcCall(method: string, params: unknown[]) {
  const response = await fetch('/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'RPC error');
  return data.result;
}

export type GameType = 'tictactoe' | 'rps' | 'connectfour';

interface CreateGameResult {
  gameId: number;
  signature: string;
}

interface JoinGameResult {
  signature: string;
}

export function useGameEscrow() {
  const { publicKey, signTransaction } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulate a transaction via the RPC proxy
  const simulateTransaction = useCallback(async (tx: Transaction) => {
    const serialized = tx.serialize({ verifySignatures: false });
    const base64Tx = Buffer.from(serialized).toString('base64');
    const result = await rpcCall('simulateTransaction', [base64Tx, {
      sigVerify: false,
      encoding: 'base64',
      commitment: 'confirmed',
    }]);
    return result;
  }, []);

  /**
   * Get the next available game ID from the blockchain
   */
  const getNextGameId = useCallback(async (): Promise<number> => {
    try {
      const [statePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('state')],
        GAME_ESCROW_PROGRAM_ID
      );

      const result = await rpcCall('getAccountInfo', [
        statePda.toBase58(),
        { encoding: 'base64', commitment: 'confirmed' }
      ]);

      if (!result || !result.value) {
        throw new Error('Contract state not found');
      }

      // Decode base64 account data
      const data = Buffer.from(result.value.data[0], 'base64');

      // State layout: discriminator(8) + authority(32) + treasury(32) + total_games(8) + ...
      const totalGames = data.readBigUInt64LE(72);
      return Number(totalGames);
    } catch (error) {
      logger.error('Failed to get next game ID:', error);
      throw error;
    }
  }, []);

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
    if (!signTransaction) {
      throw new Error('Wallet does not support signing transactions');
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

      // Deployed contract uses [b"player", player_key] seed (not per-game)
      const [playerStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('player'), publicKey.toBuffer()],
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

      // Get recent blockhash via proxy
      const blockhashResult = await rpcCall('getLatestBlockhash', [{ commitment: 'confirmed' }]);
      const blockhash = blockhashResult.value.blockhash;
      const lastValidBlockHeight = blockhashResult.value.lastValidBlockHeight;

      const tx = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      }).add(createGameIx);

      // Simulate transaction first via proxy
      try {
        const simulation = { value: await simulateTransaction(tx) };
        logger.log('Simulation logs:', simulation.value.logs);
        if (simulation.value.err) {
          logger.error('Simulation failed:', simulation.value);

          const errStr = JSON.stringify(simulation.value.err);
          if (errStr.includes('"Custom":1')) {
            const balanceResult = await rpcCall('getBalance', [publicKey.toBase58(), { commitment: 'confirmed' }]);
            const balance = balanceResult.value;
            const requiredSOL = (wagerLamports + 5000 + 5000) / LAMPORTS_PER_SOL;
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

      // Sign transaction via wallet
      const signedTransaction = await signTransaction(tx);

      // Send signed transaction via proxy
      const rawTransaction = signedTransaction.serialize();
      const base64Tx = Buffer.from(rawTransaction).toString('base64');
      const signature: string = await rpcCall('sendTransaction', [base64Tx, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 5,
        encoding: 'base64',
      }]);

      // Wait for confirmation via proxy
      const startTime = Date.now();
      const timeout = 60000; // 60 seconds
      while (Date.now() - startTime < timeout) {
        const status = await rpcCall('getSignatureStatuses', [[signature]]);
        if (status?.value?.[0]?.confirmationStatus === 'confirmed' ||
            status?.value?.[0]?.confirmationStatus === 'finalized') {
          break;
        }
        if (status?.value?.[0]?.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(status.value[0].err)}`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

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
  }, [publicKey, signTransaction, getNextGameId, simulateTransaction]);

  /**
   * Join an existing game with escrow deposit
   */
  const joinGame = useCallback(async (gameId: number): Promise<JoinGameResult> => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }
    if (!signTransaction) {
      throw new Error('Wallet does not support signing transactions');
    }

    setIsProcessing(true);
    setError(null);

    try {
      logger.log('='.repeat(50));
      logger.log('🎮 JOIN GAME STARTED');
      logger.log('Wallet:', publicKey.toString());
      logger.log('Game ID:', gameId);
      logger.log('='.repeat(50));

      // Derive PDAs
      const gameIdBuffer = Buffer.alloc(8);
      gameIdBuffer.writeBigUInt64LE(BigInt(gameId));
      const [gamePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('game'), gameIdBuffer],
        GAME_ESCROW_PROGRAM_ID
      );

      // Deployed contract uses [b"player", player_key] seed (not per-game)
      const [playerStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('player'), publicKey.toBuffer()],
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

      // Get game account to read wager
      const gameAccountResult = await rpcCall('getAccountInfo', [
        gamePda.toBase58(),
        { encoding: 'base64', commitment: 'confirmed' }
      ]);
      if (!gameAccountResult?.value) {
        throw new Error('Game not found on blockchain');
      }
      const gameData = Buffer.from(gameAccountResult.value.data[0], 'base64');

      // Read wager from game account (discriminator(8) + game_id(8) + game_type(1) + player1(32) + player2_option(1+32) + wager(8))
      const wagerOffset = 8 + 8 + 1 + 32 + 1 + 32;
      const wagerLamports = Number(gameData.readBigUInt64LE(wagerOffset));
      logger.log('Game wager:', wagerLamports, 'lamports');

      // Build join_game instruction
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

      // Get recent blockhash via proxy
      const blockhashResult = await rpcCall('getLatestBlockhash', [{ commitment: 'confirmed' }]);
      const blockhash = blockhashResult.value.blockhash;
      const lastValidBlockHeight = blockhashResult.value.lastValidBlockHeight;

      const tx = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      }).add(joinGameIx);

      // Simulate first via proxy
      try {
        const simulation = { value: await simulateTransaction(tx) };
        logger.log('Simulation logs:', simulation.value.logs);

        if (simulation.value.err) {
          logger.error('Simulation failed:', simulation.value);

          const errStr = JSON.stringify(simulation.value.err);
          if (errStr.includes('"Custom":1')) {
            const balanceResult = await rpcCall('getBalance', [publicKey.toBase58(), { commitment: 'confirmed' }]);
            const balance = balanceResult.value;
            const requiredSOL = (wagerLamports + 5000 + 5000) / LAMPORTS_PER_SOL;
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

      // Sign transaction via wallet
      const signedTransaction = await signTransaction(tx);

      // Send signed transaction via proxy
      const rawTransaction = signedTransaction.serialize();
      const base64Tx = Buffer.from(rawTransaction).toString('base64');
      const signature: string = await rpcCall('sendTransaction', [base64Tx, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 5,
        encoding: 'base64',
      }]);

      // Wait for confirmation via proxy
      const startTime = Date.now();
      const timeout = 60000;
      while (Date.now() - startTime < timeout) {
        const status = await rpcCall('getSignatureStatuses', [[signature]]);
        if (status?.value?.[0]?.confirmationStatus === 'confirmed' ||
            status?.value?.[0]?.confirmationStatus === 'finalized') {
          break;
        }
        if (status?.value?.[0]?.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(status.value[0].err)}`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

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
  }, [publicKey, signTransaction, simulateTransaction]);

  /**
   * Cancel an existing game
   */
  const cancelGame = useCallback(async (gameId: number): Promise<string> => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }
    if (!signTransaction) {
      throw new Error('Wallet does not support signing transactions');
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

      // Deployed contract uses [b"player", player_key] seed (not per-game)
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

      // Get recent blockhash via proxy
      const blockhashResult = await rpcCall('getLatestBlockhash', [{ commitment: 'confirmed' }]);
      const blockhash = blockhashResult.value.blockhash;
      const lastValidBlockHeight = blockhashResult.value.lastValidBlockHeight;

      const tx = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      }).add(cancelGameIx);

      // Simulate first via proxy
      try {
        const simulation = { value: await simulateTransaction(tx) };
        logger.log('Cancel simulation logs:', simulation.value.logs);
        if (simulation.value.err) {
          logger.error('Cancel simulation failed:', simulation.value);
          throw new Error(`Cancel simulation failed: ${JSON.stringify(simulation.value.err)}`);
        }
      } catch (simError: unknown) {
        logger.error('Cancel simulation error:', simError);
        throw simError;
      }

      // Sign transaction via wallet
      const signedTransaction = await signTransaction(tx);

      // Send signed transaction via proxy
      const rawTransaction = signedTransaction.serialize();
      const base64Tx = Buffer.from(rawTransaction).toString('base64');
      const signature: string = await rpcCall('sendTransaction', [base64Tx, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 5,
        encoding: 'base64',
      }]);

      // Wait for confirmation via proxy
      const startTime = Date.now();
      const timeout = 60000;
      while (Date.now() - startTime < timeout) {
        const status = await rpcCall('getSignatureStatuses', [[signature]]);
        if (status?.value?.[0]?.confirmationStatus === 'confirmed' ||
            status?.value?.[0]?.confirmationStatus === 'finalized') {
          break;
        }
        if (status?.value?.[0]?.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(status.value[0].err)}`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

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
  }, [publicKey, signTransaction, simulateTransaction]);

  return {
    createGame,
    joinGame,
    cancelGame,
    getNextGameId,
    isProcessing,
    error,
  };
}
