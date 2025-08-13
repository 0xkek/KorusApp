import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID 
} from '@solana/spl-token';
import { AnchorProvider, Program, web3, BN } from '@coral-xyz/anchor';
import { getContractAddresses, TOKEN_CONFIG, TIP_LIMITS } from './contractConfig';
import { config } from '../../config/environment';
import { logger } from '../logger';

export interface TipStats {
  tipsSent: number;
  tipsReceived: number;
  totalSent: number;
  totalReceived: number;
}

export class TippingClient {
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
    
    // TODO: Load IDL and create program after deployment
    // const idl = await import('./idl/korus_tipping.json');
    // this.program = new Program(idl, new PublicKey(getContractAddresses().tipping), this.provider);
  }

  async sendTip(
    recipient: string,
    amount: number,
    postId: string,
    wallet: any
  ): Promise<string> {
    if (!this.program || !this.provider) {
      throw new Error('Program not initialized');
    }

    logger.log('Sending tip:', { recipient, amount, postId });

    // Validate amount
    if (amount < TIP_LIMITS.minTip) {
      throw new Error(`Minimum tip is ${TIP_LIMITS.minTip} SOL`);
    }

    const amountBN = new BN(amount * web3.LAMPORTS_PER_SOL);
    const recipientPubkey = new PublicKey(recipient);

    // Get state PDA
    const [statePda] = await PublicKey.findProgramAddress(
      [Buffer.from('state')],
      new PublicKey(getContractAddresses().tipping)
    );

    // Get tip record PDA
    const [tipRecordPda] = await PublicKey.findProgramAddress(
      [
        Buffer.from('tip'),
        wallet.publicKey.toBuffer(),
        recipientPubkey.toBuffer(),
        Buffer.from(postId),
      ],
      new PublicKey(getContractAddresses().tipping)
    );

    // Get user stats PDAs
    const [senderStatsPda] = await PublicKey.findProgramAddress(
      [Buffer.from('stats'), wallet.publicKey.toBuffer()],
      new PublicKey(getContractAddresses().tipping)
    );

    const [recipientStatsPda] = await PublicKey.findProgramAddress(
      [Buffer.from('stats'), recipientPubkey.toBuffer()],
      new PublicKey(getContractAddresses().tipping)
    );

    // Get token accounts
    const senderAta = await getAssociatedTokenAddress(
      TOKEN_CONFIG.mint,
      wallet.publicKey
    );

    const recipientAta = await getAssociatedTokenAddress(
      TOKEN_CONFIG.mint,
      recipientPubkey
    );

    const treasuryAta = await getAssociatedTokenAddress(
      TOKEN_CONFIG.mint,
      new PublicKey(getContractAddresses().treasury)
    );

    try {
      // Send tip transaction
      const tx = await this.program.methods
        .sendTip(amountBN, postId)
        .accounts({
          state: statePda,
          tipRecord: tipRecordPda,
          senderStats: senderStatsPda,
          recipientStats: recipientStatsPda,
          sender: wallet.publicKey,
          recipient: recipientPubkey,
          senderAta,
          recipientAta,
          treasuryAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      logger.log('Tip sent successfully:', tx);
      return tx;
    } catch (error) {
      logger.error('Failed to send tip:', error);
      throw error;
    }
  }

  async getUserStats(userAddress: string): Promise<TipStats | null> {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    try {
      const [statsPda] = await PublicKey.findProgramAddress(
        [Buffer.from('stats'), new PublicKey(userAddress).toBuffer()],
        new PublicKey(getContractAddresses().tipping)
      );

      const stats = await this.program.account.userStats.fetch(statsPda);
      
      return {
        tipsSent: stats.tipsSent.toNumber(),
        tipsReceived: stats.tipsReceived.toNumber(),
        totalSent: stats.totalSent.toNumber() / web3.LAMPORTS_PER_SOL,
        totalReceived: stats.totalReceived.toNumber() / web3.LAMPORTS_PER_SOL,
      };
    } catch (error) {
      logger.error('Failed to fetch user stats:', error);
      return null;
    }
  }

  calculatePlatformFee(amount: number): number {
    return (amount * TIP_LIMITS.platformFeeBps) / 10000;
  }

  calculateRecipientAmount(amount: number): number {
    return amount - this.calculatePlatformFee(amount);
  }
}

export const tippingClient = new TippingClient();