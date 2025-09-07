import { useState, useEffect } from 'react';
import { postsAPI, hasAuthToken, interactionsAPI, sponsoredAPI } from '../utils/api';
import { Post as PostType } from '../types';
import { logger } from '../utils/logger';
import { postAvatarCache } from '../services/postAvatarCache';

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
      
      // Try to load from API
      const response = await postsAPI.getPosts({ limit: 50 });
      
      // Debug log to see what backend returns
      if (response.posts && response.posts.length > 0) {
        const samplePost = response.posts[0];
        logger.log('=== POST DATA DEBUG ===');
        logger.log('Full post:', JSON.stringify(samplePost, null, 2));
        logger.log('likeCount:', samplePost.likeCount);
        logger.log('replyCount:', samplePost.replyCount);
        logger.log('Has replyCount field?', 'replyCount' in samplePost);
        logger.log('Type of replyCount:', typeof samplePost.replyCount);
        logger.log('=== END DEBUG ===');
      }
      
      if (response.posts && response.posts.length > 0) {
        // Transform backend posts to app format
        const transformedPosts = await Promise.all(response.posts.map(async (post: any) => {
          // Log image URLs for debugging
          if (post.imageUrl) {
            logger.log('Post has image:', {
              postId: post.id,
              imageUrl: post.imageUrl,
              urlLength: post.imageUrl.length,
              startsWithHttp: post.imageUrl.startsWith('http'),
              includesCloudinary: post.imageUrl.includes('cloudinary')
            });
          }
          
          const wallet = post.authorWallet || post.author?.walletAddress || 'Unknown';
          
          // Get avatar from backend first, then try cache as fallback
          const backendAvatar = post.author?.nftAvatar?.replace(/&#x2F;/g, '/');
          let avatar = backendAvatar;
          
          // If no backend avatar, try cache
          if (!avatar) {
            avatar = await postAvatarCache.getAvatar(post.id, wallet);
          }
          
          // If we have a backend avatar, save it to cache for future use
          if (backendAvatar) {
            await postAvatarCache.saveAvatar(String(post.id), wallet, backendAvatar);
          }
          
          return {
            id: post.id,
            wallet: wallet,
            username: post.author?.username || undefined, // Include username from backend
            avatar: avatar || undefined, // Use backend avatar first, then cached
            time: new Date(post.createdAt).toLocaleDateString(),
            content: post.content,
            likes: post.likeCount || 0,
            replies: [], // Initialize empty, will fetch separately if needed
            replyCount: post.replyCount || 0, // Store reply count
            tips: post.tipCount || 0,
            liked: post.liked || false, // Preserve liked state if it exists
            category: post.subtopic || 'general',
            imageUrl: post.imageUrl,
            videoUrl: post.videoUrl,
            isPremium: post.author?.tier === 'premium',
            sponsored: false, // Will be updated with sponsored posts
            userTheme: undefined,
            gameData: undefined
          };
        }));
        
        // Fetch sponsored posts
        try {
          const sponsoredResponse = await sponsoredAPI.getSponsoredPosts();
          if (sponsoredResponse.success && sponsoredResponse.sponsoredPosts) {
            // Mark sponsored posts
            const sponsoredIds = new Set(sponsoredResponse.sponsoredPosts.map((sp: any) => sp.postId));
            transformedPosts.forEach(post => {
              if (sponsoredIds.has(post.id)) {
                post.sponsored = true;
              }
            });
          }
        } catch (error) {
          logger.log('Failed to fetch sponsored posts:', error);
          // FOR TESTING: Mark the first post as sponsored to test the UI
          if (transformedPosts.length > 0) {
            transformedPosts[0].sponsored = true;
            logger.log('🎯 TEST MODE: Marked first post as sponsored for testing');
          }
        }
        
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
        // If no posts from API, show empty array
        logger.log('No posts from API');
        setPosts([]);
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
      
      // Show empty posts if API fails
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  return { posts, setPosts, loading, error, refetch: loadPosts };
}