import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

const POST_AVATAR_CACHE_KEY = 'korus_post_avatar_cache';

interface PostAvatarData {
  [postId: string]: {
    avatar: string; // NFT URL or emoji
    wallet: string; // To verify it's the right post
  };
}

class PostAvatarCache {
  private cache: PostAvatarData = {};
  private loaded = false;
  
  async loadCache() {
    if (this.loaded) return;
    
    try {
      const stored = await AsyncStorage.getItem(POST_AVATAR_CACHE_KEY);
      if (stored) {
        this.cache = JSON.parse(stored);
        logger.log('Loaded post avatar cache with', Object.keys(this.cache).length, 'entries');
      }
      this.loaded = true;
    } catch (error) {
      logger.error('Failed to load post avatar cache:', error);
      this.loaded = true;
    }
  }
  
  async saveAvatar(postId: string, wallet: string, avatar: string | null | undefined) {
    if (!avatar) return;
    
    await this.loadCache();
    
    // Store the avatar for this post
    this.cache[postId] = { avatar, wallet };
    
    // Save to storage
    try {
      await AsyncStorage.setItem(POST_AVATAR_CACHE_KEY, JSON.stringify(this.cache));
      logger.log('Saved avatar for post', postId);
    } catch (error) {
      logger.error('Failed to save post avatar cache:', error);
    }
  }
  
  async getAvatar(postId: string, wallet: string): Promise<string | null> {
    await this.loadCache();
    
    const data = this.cache[postId];
    if (data && data.wallet === wallet) {
      return data.avatar;
    }
    
    return null;
  }
  
  async clearCache() {
    this.cache = {};
    this.loaded = false;
    await AsyncStorage.removeItem(POST_AVATAR_CACHE_KEY);
  }
}

export const postAvatarCache = new PostAvatarCache();