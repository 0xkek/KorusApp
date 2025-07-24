import * as SecureStore from 'expo-secure-store';

export async function clearAllStorage() {
  const keys = [
    'korus_wallet',
    'korus_wallet_address',
    'korus_user_avatar',
    'korus_user_nft_avatar',
    'korus_favorite_sns_domain',
    'korus_premium_status',
    'korus_timefun_username',
    'korus_offline_mode',
    'korus_auth_token',
    'korus_hide_sponsored_posts',
    'korus_theme_preference',
    'korus_dark_mode'
  ];
  
  for (const key of keys) {
    try {
      await SecureStore.deleteItemAsync(key);
      console.log(`Cleared: ${key}`);
    } catch (error) {
      console.error(`Failed to clear ${key}:`, error);
    }
  }
  
  console.log('All storage cleared!');
}