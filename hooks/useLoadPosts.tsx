import { useState, useEffect } from 'react';
import { postsAPI, hasAuthToken, interactionsAPI } from '../utils/api';
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
      
      // Check if we have an auth token
      const hasToken = await hasAuthToken();
      logger.log('Loading posts, hasAuthToken:', hasToken);
      
      // Try to load from API
      const response = await postsAPI.getPosts({ limit: 50 });
      logger.log('Posts API response:', response);
      
      if (response.posts && response.posts.length > 0) {
        // Transform backend posts to app format
        const transformedPosts = response.posts.map((post: any) => ({
          id: post.id,
          wallet: post.authorWallet || post.author?.walletAddress || 'Unknown',
          time: new Date(post.createdAt).toLocaleDateString(),
          content: post.content,
          likes: post.likeCount || 0,
          replies: post.replies || [],
          tips: post.tipCount || 0,
          liked: post.liked || false, // Preserve liked state if it exists
          category: post.subtopic || 'general',
          imageUrl: post.imageUrl,
          videoUrl: post.videoUrl,
          isPremium: post.author?.tier === 'premium',
          userTheme: undefined,
          gameData: undefined
        }));
        
        // Fetch user interactions to show which posts are already liked
        if (hasToken) {
          try {
            const postIds = transformedPosts.map(p => p.id);
            const interactionsResponse = await interactionsAPI.getUserInteractions(postIds);
            
            if (interactionsResponse.success && interactionsResponse.interactions) {
              // Update posts with user interaction data
              const finalPosts = transformedPosts.map(post => ({
                ...post,
                liked: interactionsResponse.interactions[String(post.id)]?.liked || false,
                // We could also use tipped status in the future
              }));
              setPosts(finalPosts);
            } else {
              setPosts(transformedPosts);
            }
          } catch (error: any) {
            // Check if it's a 404 (endpoint not deployed yet)
            if (error.response?.status === 404) {
              logger.log('User interactions endpoint not available yet - backend needs redeploy');
            } else {
              logger.error('Failed to fetch user interactions:', error);
            }
            // Still show posts even if interactions fail
            setPosts(transformedPosts);
          }
        } else {
          setPosts(transformedPosts);
        }
      } else {
        // If no posts from API, show some mock posts to get started
        logger.log('No posts from API, using mock data');
        setPosts(initialPosts.slice(0, 5));
      }
    } catch (err: any) {
      logger.error('Failed to load posts:', err);
      logger.error('Error details:', {
        message: err.message,
        code: err.code,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          headers: err.config?.headers,
          baseURL: err.config?.baseURL,
        }
      });
      
      // Show the exact error in the UI for debugging
      const errorMsg = `API Error: ${err.response?.status || err.code} - ${err.message}`;
      setError(errorMsg);
      logger.error('Setting error message:', errorMsg);
      
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