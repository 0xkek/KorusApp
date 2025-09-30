import { Transaction, Connection, PublicKey } from '@solana/web3.js';
import { Platform } from 'react-native';
import { logger } from './logger';
import { config } from '../config/environment';

/**
 * Sign and send a transaction using Mobile Wallet Adapter on Android
 */
export async function signAndSendTransactionMobile(
  transaction: Transaction,
  connection: Connection,
  walletAddress: string
): Promise<string> {
  if (Platform.OS === 'web') {
    throw new Error('This function is only for mobile platforms');
  }

  logger.info('Starting mobile transaction signing');

  // Debug the transaction object
  logger.info('Transaction type:', typeof transaction);
  logger.info('Transaction constructor:', transaction?.constructor?.name);
  logger.info('Has serialize method:', typeof transaction?.serialize);

  // Don't serialize here - pass the transaction object directly
  // The MWA wrapper will handle serialization
  logger.info('Passing transaction object to MWA');

  try {
    // Import MWA dynamically
    const mwaModule = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
    const { transact } = mwaModule;

    if (!transact) {
      throw new Error('MWA transact function not available');
    }

    // Use MWA to sign and send transaction
    const signature = await transact(async (wallet: any) => {
      logger.log('MWA transaction started for wallet:', walletAddress);

      // Import Transaction class fresh inside the callback to preserve prototype
      const { Transaction: FreshTransaction } = require('@solana/web3.js');

      // Reconstruct the transaction with the fresh Transaction class
      const tx = FreshTransaction.from(transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      }));

      logger.log('Transaction reconstructed with fresh class');

      // For Solflare, we might already be authorized from the connection
      // Try to reauthorize with existing auth token if available
      logger.log('Attempting to authorize for transaction...');

      let authResult;
      // Always use solana:devnet format as per Solana Mobile SDK docs
      try {
        authResult = await wallet.authorize({
          cluster: 'solana:devnet',
          identity: {
            name: config.appName || 'Korus',
            uri: config.appUrl || 'https://korus.app',
            icon: 'favicon.ico',
          },
        });
        logger.log('Authorization successful');
      } catch (authError: any) {
        logger.error('Authorization failed:', authError);

        // Check if already authorized
        if (walletAddress && authError.message?.includes('already authorized')) {
          logger.log('Wallet already authorized, proceeding with:', walletAddress);
          authResult = {
            accounts: [{ address: Buffer.from(new PublicKey(walletAddress).toBytes()).toString('base64') }],
          };
        } else {
          throw authError;
        }
      }

      logger.log('Wallet authorized for transaction, accounts:', authResult.accounts?.length);

      // Get the base64 address from auth result
      const base64Address = authResult.accounts[0].address;

      // Transaction was already serialized before entering MWA context
      logger.log('Using pre-serialized transaction, requesting signature...');

      // Sign and send the transaction
      logger.log('Calling signAndSendTransactions...');

      let signedTxs;
      try {
        signedTxs = await wallet.signAndSendTransactions({
          transactions: [tx],  // Pass the Transaction object, not serialized
        });
      } catch (signError: any) {
        logger.error('signAndSendTransactions failed:', signError);

        // Try alternative method for Solflare
        logger.log('Trying signTransactions instead...');
        const signedTx = await wallet.signTransactions({
          transactions: [tx],  // Pass the Transaction object, not serialized
        });

        if (signedTx && signedTx.length > 0) {
          // Send the signed transaction manually
          logger.log('Sending signed transaction manually...');
          const signature = await connection.sendRawTransaction(signedTx[0]);
          signedTxs = [signature];
        } else {
          throw signError;
        }
      }

      if (!signedTxs || signedTxs.length === 0) {
        throw new Error('Failed to sign and send transaction');
      }

      const txSignature = signedTxs[0];
      logger.log('Transaction signed and sent:', txSignature);

      return txSignature;
    });

    return signature;
  } catch (error: any) {
    logger.error('Mobile transaction failed:', error);

    // Check if user cancelled
    if (error.toString().includes('CancellationException') ||
        error.message?.includes('cancelled')) {
      throw new Error('Transaction cancelled by user');
    }

    throw new Error(`Failed to sign transaction: ${error.message || 'Unknown error'}`);
  }
}