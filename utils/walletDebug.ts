// Temporary debug file to test different cluster formats
import { config } from '../config/environment';

// Some wallets expect different cluster formats
export function getClusterForWallet(walletName: string): string {
  // Always use devnet for now
  const cluster = 'devnet';
  
  // Log what we're sending
  console.log(`[WalletDebug] Cluster for ${walletName}: ${cluster}`);
  
  return cluster;
}

// Debug function to log all connection parameters
export function debugConnectionParams(params: any) {
  console.log('[WalletDebug] Connection parameters:', JSON.stringify(params, null, 2));
}