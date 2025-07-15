import { Alert } from 'react-native';

export function generateWalletAddress(): string {
  // Generate a mock Solana-style wallet address (base58, 32-44 chars)
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function validateWalletAddress(address: string): boolean {
  // Basic validation for Solana-style addresses (base58, 32-44 chars)
  const regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return regex.test(address);
}

export function connectWallet(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Mock wallet connection
    setTimeout(() => {
      const address = generateWalletAddress();
      Alert.alert('Wallet Connected', `Address: ${address}`);
      resolve(address);
    }, 1000);
  });
}

export function disconnectWallet(): void {
  Alert.alert('Wallet Disconnected', 'Your wallet has been disconnected.');
}
