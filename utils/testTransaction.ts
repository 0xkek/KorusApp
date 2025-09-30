import { PublicKey, Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { logger } from './logger';
import { config } from '../config/environment';

export async function testSimpleTransaction(walletAddress: string) {
  logger.log('Test transaction starting...');

  try {
    const connection = new Connection(config.solanaRpcUrl, 'confirmed');
    const walletPubkey = new PublicKey(walletAddress);

    // Create a minimal test transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: walletPubkey,
        toPubkey: walletPubkey,
        lamports: 1000, // 0.000001 SOL
      })
    );

    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletPubkey;

    logger.log('Transaction created, opening MWA...');

    // Use MWA
    const { transact } = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');

    const signature = await transact(async (wallet: any) => {
      logger.log('MWA opened, authorizing...');

      // Try different auth approaches
      let authResult;
      try {
        // Try with minimal auth
        authResult = await wallet.authorize({
          cluster: 'devnet',
          identity: {
            name: 'Korus Test',
          },
        });
        logger.log('Minimal auth successful');
      } catch (e1: any) {
        logger.log('Minimal auth failed:', e1.message);

        // Try with full auth
        try {
          authResult = await wallet.authorize({
            cluster: 'solana:devnet',
            identity: {
              name: 'Korus',
              uri: 'https://korus.app',
              icon: 'favicon.ico',
            },
          });
          logger.log('Full auth successful');
        } catch (e2: any) {
          logger.error('All auth attempts failed:', e2);
          throw e2;
        }
      }

      logger.log('Auth complete, signing transaction...');

      // Try signing
      const signedTxs = await wallet.signAndSendTransactions({
        transactions: [transaction]
      });

      logger.log('Transaction signed and sent:', signedTxs[0]);
      return signedTxs[0];
    });

    logger.log('Test transaction successful:', signature);
    return signature;

  } catch (error: any) {
    logger.error('Test transaction failed:', {
      message: error.message,
      stack: error.stack,
      error
    });
    throw error;
  }
}