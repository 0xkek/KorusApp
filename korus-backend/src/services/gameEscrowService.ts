import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { 
  connection, 
  getProvider, 
  loadAuthorityKeypair, 
  GAME_ESCROW_PROGRAM_ID,
  TREASURY_WALLET 
} from '../config/solana';

// Minimal IDL for the contract
const IDL = {
  version: "0.1.0",
  name: "korus_game_escrow",
  instructions: [
    {
      name: "completeGame",
      accounts: [
        { name: "state", isMut: true, isSigner: false },
        { name: "game", isMut: true, isSigner: false },
        { name: "player1State", isMut: true, isSigner: false },
        { name: "player2State", isMut: true, isSigner: false },
        { name: "escrow", isMut: true, isSigner: false },
        { name: "treasury", isMut: true, isSigner: false },
        { name: "player1", isMut: true, isSigner: false },
        { name: "player2", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true }
      ],
      args: [
        { name: "winner", type: "publicKey" }
      ]
    },
    {
      name: "updateMoveTime",
      accounts: [
        { name: "game", isMut: true, isSigner: false },
        { name: "player", isMut: false, isSigner: true }
      ],
      args: []
    }
  ]
};

export class GameEscrowService {
  private program: anchor.Program;
  private provider: anchor.AnchorProvider;

  constructor() {
    this.provider = getProvider();
    this.program = new anchor.Program(IDL as any, GAME_ESCROW_PROGRAM_ID, this.provider);
  }

  /**
   * Complete a game and distribute winnings
   * This is called by the backend after determining the winner
   */
  async completeGame(
    gameId: number,
    player1: PublicKey,
    player2: PublicKey,
    winner: PublicKey
  ): Promise<string> {
    try {
      console.log('Completing game on-chain:', { gameId, winner: winner.toString() });

      // Derive PDAs
      const [statePda] = await PublicKey.findProgramAddress(
        [Buffer.from('state')],
        GAME_ESCROW_PROGRAM_ID
      );

      // Fix: Use u64 LE encoding for game ID (matching smart contract)
      const gameIdBuffer = Buffer.alloc(8);
      gameIdBuffer.writeBigUInt64LE(BigInt(gameId));
      const [gamePda] = await PublicKey.findProgramAddress(
        [Buffer.from('game'), gameIdBuffer],
        GAME_ESCROW_PROGRAM_ID
      );

      const [player1StatePda] = await PublicKey.findProgramAddress(
        [Buffer.from('player'), player1.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      const [player2StatePda] = await PublicKey.findProgramAddress(
        [Buffer.from('player'), player2.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      const [escrowPda] = await PublicKey.findProgramAddress(
        [Buffer.from('escrow'), gamePda.toBuffer()],
        GAME_ESCROW_PROGRAM_ID
      );

      // Call complete_game with backend authority
      const tx = await this.program.methods
        .completeGame(winner)
        .accounts({
          state: statePda,
          game: gamePda,
          player1State: player1StatePda,
          player2State: player2StatePda,
          escrow: escrowPda,
          treasury: TREASURY_WALLET,
          player1: player1,
          player2: player2,
          authority: this.provider.wallet.publicKey,
        })
        .rpc();

      console.log('✅ Game completed on-chain:', tx);
      return tx;
    } catch (error) {
      console.error('Failed to complete game on-chain:', error);
      throw error;
    }
  }

  /**
   * Get game state from blockchain
   */
  async getGameState(gameId: number): Promise<any> {
    try {
      // Fix: Use u64 LE encoding for game ID (matching smart contract)
      const gameIdBuffer = Buffer.alloc(8);
      gameIdBuffer.writeBigUInt64LE(BigInt(gameId));
      const [gamePda] = await PublicKey.findProgramAddress(
        [Buffer.from('game'), gameIdBuffer],
        GAME_ESCROW_PROGRAM_ID
      );

      const gameAccount = await this.program.account.game.fetch(gamePda);
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

      const state = await this.program.account.state.fetch(statePda);
      console.log('Contract state:', {
        authority: state.authority.toString(),
        treasury: state.treasury.toString(),
        totalGames: state.totalGames.toString(),
        platformFeeBps: state.platformFeeBps,
      });

      // Check if our backend has the right authority
      const currentAuthority = loadAuthorityKeypair();
      if (!state.authority.equals(currentAuthority.publicKey)) {
        console.error('⚠️  Backend authority mismatch!');
        console.error('Contract authority:', state.authority.toString());
        console.error('Backend authority:', currentAuthority.publicKey.toString());
        return false;
      }

      console.log('✅ Contract properly initialized with backend authority');
      return true;
    } catch (error) {
      console.error('Contract not initialized:', error);
      return false;
    }
  }
}

export const gameEscrowService = new GameEscrowService();