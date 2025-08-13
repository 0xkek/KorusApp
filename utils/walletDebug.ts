// Temporary debug file to test different cluster formats
import { config } from '../config/environment';

// Some wallets expect different cluster formats
export function getClusterForWallet(walletName: string): string {
  const cluster = config.solanaCluster;
  
  // Log what we're sending
  console.log(`[WalletDebug] Cluster for ${walletName}: ${cluster}`);
  
  // Phantom on mobile might expect a different format
  if (walletName === 'phantom' && cluster === 'solana:mainnet-beta') {
    // Try without the 'solana:' prefix
    const phantomCluster = 'mainnet-beta';
    console.log(`[WalletDebug] Using Phantom-specific cluster: ${phantomCluster}`);
    return phantomCluster;
  }
  
  return cluster;
}

// Debug function to log all connection parameters
export function debugConnectionParams(params: any) {
  console.log('[WalletDebug] Connection parameters:', JSON.stringify(params, null, 2));
}