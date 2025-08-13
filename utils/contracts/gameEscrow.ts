import { PublicKey, Connection, Transaction, SystemProgram } from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID 
} from '@solana/spl-token';
import { AnchorProvider, Program, web3, BN } from '@coral-xyz/anchor';
import { config } from '../../config/environment';

// Program IDs (update these after deployment)
export const GAME_ESCROW_PROGRAM_ID = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');
export const TIPPING_PROGRAM_ID = new PublicKey('Gf6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnT');

// Token mint (SOL wrapped as SPL token for now, can change to USDC)
export const GAME_TOKEN_MINT = new PublicKey('So11111111111111111111111111111111111111112');

// Game types enum
export enum GameType {
  GuessTheWord = 'guessTheWord',
  TruthOrDare = 'truthOrDare',
}

export interface GameAccount {
  id: BN;
  gameType: any;
  creator: PublicKey;
  opponent: PublicKey | null;
  wagerAmount: BN;
  status: number;
  winner: PublicKey | null;
  gameData: string;
  createdAt: BN;
  expiresAt: BN;
  escrow: PublicKey;
}

export class GameEscrowClient {
  private connection: Connection;
  private program: Program | null = null;
  private provider: AnchorProvider | null = null;

  constructor() {
    this.connection = new Connection(config.solanaRpcUrl, 'confirmed');
  }

  async initialize(wallet: any) {
    this.provider = new AnchorProvider(
      this.connection,
      wallet,
      { commitment: 'confirmed' }
    );
    
    // Load IDL and create program
    // In production, you'd load the IDL from a file or API
    // For now, we'll need to generate it after building the contract
    // this.program = new Program(idl, GAME_ESCROW_PROGRAM_ID, this.provider);
  }

  async createGame(
    gameType: GameType,
    wagerAmount: number,
    gameData: string,
    wallet: any
  ): Promise<string> {
    if (!this.program || !this.provider) {
      throw new Error('Program not initialized');
    }

    const wagerBN = new BN(wagerAmount * web3.LAMPORTS_PER_SOL);
    
    // Get state PDA
    const [statePda] = await PublicKey.findProgramAddress(
      [Buffer.from('state')],
      GAME_ESCROW_PROGRAM_ID
    );

    // Get next game ID from state
    const state = await this.program.account.state.fetch(statePda);
    const gameId = state.totalGames;

    // Derive PDAs
    const [gamePda] = await PublicKey.findProgramAddress(
      [Buffer.from('game'), gameId.toArrayLike(Buffer, 'le', 8)],
      GAME_ESCROW_PROGRAM_ID
    );

    const [escrowPda] = await PublicKey.findProgramAddress(
      [Buffer.from('escrow'), gamePda.toBuffer()],
      GAME_ESCROW_PROGRAM_ID
    );

    // Get creator's token account
    const creatorAta = await getAssociatedTokenAddress(
      GAME_TOKEN_MINT,
      wallet.publicKey
    );

    // Create game transaction
    const tx = await this.program.methods
      .createGame(
        { [gameType]: {} },
        wagerBN,
        gameData
      )
      .accounts({
        state: statePda,
        game: gamePda,
        escrow: escrowPda,
        creator: wallet.publicKey,
        creatorAta: creatorAta,
        mint: GAME_TOKEN_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    return tx;
  }

  async joinGame(gameId: number, wallet: any): Promise<string> {
    if (!this.program || !this.provider) {
      throw new Error('Program not initialized');
    }

    // Derive PDAs
    const [gamePda] = await PublicKey.findProgramAddress(
      [Buffer.from('game'), new BN(gameId).toArrayLike(Buffer, 'le', 8)],
      GAME_ESCROW_PROGRAM_ID
    );

    const [escrowPda] = await PublicKey.findProgramAddress(
      [Buffer.from('escrow'), gamePda.toBuffer()],
      GAME_ESCROW_PROGRAM_ID
    );

    // Get opponent's token account
    const opponentAta = await getAssociatedTokenAddress(
      GAME_TOKEN_MINT,
      wallet.publicKey
    );

    // Join game transaction
    const tx = await this.program.methods
      .joinGame()
      .accounts({
        game: gamePda,
        escrow: escrowPda,
        opponent: wallet.publicKey,
        opponentAta: opponentAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  async getGame(gameId: number): Promise<GameAccount | null> {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    try {
      const [gamePda] = await PublicKey.findProgramAddress(
        [Buffer.from('game'), new BN(gameId).toArrayLike(Buffer, 'le', 8)],
        GAME_ESCROW_PROGRAM_ID
      );

      const game = await this.program.account.game.fetch(gamePda);
      return game as GameAccount;
    } catch (error) {
      console.error('Failed to fetch game:', error);
      return null;
    }
  }

  async getOpenGames(): Promise<GameAccount[]> {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    try {
      // Fetch all games and filter for open ones
      const games = await this.program.account.game.all([
        {
          memcmp: {
            offset: 8 + 1 + 32 + 33 + 8, // Offset to status field
            bytes: bs58.encode(Buffer.from([0])), // Status = Open
          },
        },
      ]);

      return games.map(g => g.account as GameAccount);
    } catch (error) {
      console.error('Failed to fetch open games:', error);
      return [];
    }
  }
}

export const gameEscrowClient = new GameEscrowClient();