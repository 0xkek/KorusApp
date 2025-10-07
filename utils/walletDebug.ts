import { logger } from './logger';

/**
 * Get the appropriate cluster for a wallet provider
 */
export function getClusterForWallet(walletName: string): 'devnet' | 'testnet' | 'mainnet-beta' {
  // Default to mainnet-beta for production
  const network = process.env.EXPO_PUBLIC_SOLANA_NETWORK || 'mainnet-beta';

  switch (network) {
    case 'devnet':
      return 'devnet';
    case 'testnet':
      return 'testnet';
    case 'mainnet-beta':
    case 'mainnet':
      return 'mainnet-beta';
    default:
      logger.warn(`Unknown network ${network}, defaulting to mainnet-beta`);
      return 'mainnet-beta';
  }
}

/**
 * Debug connection parameters for wallet connections
 */
export function debugConnectionParams(params: any): void {
  logger.log('Wallet connection parameters:', {
    cluster: params.cluster,
    identity: params.identity,
    hasAuthToken: !!params.auth_token,
  });
}

/**
 * Debug wallet connection status
 */
export function debugWalletStatus(wallet: any, status: string): void {
  logger.log(`Wallet status: ${status}`, {
    walletAvailable: !!wallet,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Debug transaction signing
 */
export function debugTransactionSigning(transaction: any, walletAddress?: string): void {
  logger.log('Transaction signing debug:', {
    hasTransaction: !!transaction,
    walletAddress: walletAddress || 'unknown',
    timestamp: new Date().toISOString(),
  });
}