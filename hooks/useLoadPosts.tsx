import { useState, useEffect } from 'react';
import { postsAPI } from '../utils/api';
import { Post as PostType } from '../types';
import { logger } from '../utils/logger';
import { initialPosts } from '../data/mockData';

export function useLoadPosts() {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to load from API
      const response = await postsAPI.getPosts({ limit: 50 });
      
      if (response.posts && response.posts.length > 0) {
        setPosts(response.posts);
      } else {
        // If no posts from API, show some mock posts to get started
        setPosts(initialPosts.slice(0, 5));
      }
    } catch (err) {
      logger.error('Failed to load posts:', err);
      setError('Failed to load posts');
      // Fall back to mock data if API fails
      setPosts(initialPosts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  return { posts, setPosts, loading, error, refetch: loadPosts };
}