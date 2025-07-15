import { Alert } from 'react-native';

export function generateWalletAddress(): string {
  // Generate a mock wallet address
  const chars = '0123456789abcdef';
  let result = '0x';
  for (let i = 0; i < 40; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function validateWalletAddress(address: string): boolean {
  // Basic validation for Ethereum-style addresses
  const regex = /^0x[a-fA-F0-9]{40}$/;
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
