import * as SecureStore from 'expo-secure-store';
import { logger } from './logger';

export async function debugSecureStore() {
  const keys = [
    'korus_wallet_address',
    'korus_wallet_provider',
    'korus_auth_token',
    'korus_user_avatar',
    'korus_user_nft_avatar',
    'korus_favorite_sns_domain',
    'korus_premium_status',
    'korus_timefun_username',
  ];
  
  logger.log('=== SecureStore Debug ===');
  
  for (const key of keys) {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value) {
        logger.log(`${key}:`, value.length > 100 ? value.substring(0, 100) + '...' : value);
      } else {
        logger.log(`${key}: null/undefined`);
      }
    } catch (error) {
      logger.error(`Error reading ${key}:`, error);
    }
  }
  
  logger.log('=== End SecureStore Debug ===');
}