import { Linking, Platform } from 'react-native';

export const WALLET_SCHEMES = {
  phantom: 'phantom://',
  solflare: 'solflare://',
  backpack: 'backpack://',
};

export const checkWalletInstalled = async (walletName: keyof typeof WALLET_SCHEMES): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  
  try {
    const scheme = WALLET_SCHEMES[walletName];
    return await Linking.canOpenURL(scheme);
  } catch (error) {
    console.log(`Error checking if ${walletName} is installed:`, error);
    return false;
  }
};

export const checkAnyWalletInstalled = async (): Promise<boolean> => {
  const wallets = Object.keys(WALLET_SCHEMES) as (keyof typeof WALLET_SCHEMES)[];
  
  for (const wallet of wallets) {
    const isInstalled = await checkWalletInstalled(wallet);
    if (isInstalled) return true;
  }
  
  return false;
};

export const getInstalledWallets = async (): Promise<string[]> => {
  const wallets = Object.keys(WALLET_SCHEMES) as (keyof typeof WALLET_SCHEMES)[];
  const installed: string[] = [];
  
  for (const wallet of wallets) {
    const isInstalled = await checkWalletInstalled(wallet);
    if (isInstalled) installed.push(wallet);
  }
  
  return installed;
};