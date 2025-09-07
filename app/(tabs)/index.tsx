import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { config } from '../../config/environment';
import { useKorusAlert } from '../../components/KorusAlertProvider';
import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import { useGames } from '../../context/GameContext';
import { Post as PostType, Reply, GameType } from '../../types';
import { registerForPushNotificationsAsync, setupNotificationListeners } from '../../utils/notifications';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../utils/logger';
import { reputationService } from '../../services/reputation';
import { postAvatarCache } from '../../services/postAvatarCache';
import { Fonts, FontSizes } from '../../constants/Fonts';
import { useLoadPosts } from '../../hooks/useLoadPosts';
import { postsAPI, interactionsAPI, repliesAPI } from '../../utils/api';
import { testBackendConnection } from '../../utils/testApi';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FeedSkeleton } from '../../components/SkeletonLoader';
import { getErrorMessage } from '../../utils/errorHandler';

// Components
import CreatePostModal from '../../components/CreatePostModal';
import Header from '../../components/Header';
import Post from '../../components/Post';
import ReplyModal from '../../components/ReplyModal';
import ReportModal from '../../components/ReportModal';
import TipModal from '../../components/TipModal';
import TipSuccessModal from '../../components/TipSuccessModal';
import GamesView from '../../components/GamesView';
import EventsView from '../../components/EventsView';
// DemoInstructions removed for production

// Create AnimatedFlatList to support native driver
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

// Global type declaration for scroll to top and reset functions
declare global {
  var scrollToTop: (() => void) | undefined;
  var refreshFeed: (() => void) | undefined;
  var resetToGeneral: (() => void) | undefined;
}

const HIDE_SPONSORED_KEY = 'korus_hide_sponsored_posts';
const RECENTLY_EXPANDED_KEY = 'korus_recently_expanded_posts';
const MAX_RECENTLY_EXPANDED = 10;

// Reply sorting types
type ReplySortType = 'best' | 'recent';

export default function HomeScreen() {
  const { colors, isDarkMode, gradients } = useTheme();
  const { showAlert } = useKorusAlert();
  const { walletAddress, balance, deductBalance, selectedAvatar, selectedNFTAvatar, isPremium, snsDomain } = useWallet();
  const { addGamePost } = useGames();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // Debug NFT avatar state
  React.useEffect(() => {
    logger.log('Feed - NFT avatar state:', {
      hasNFTAvatar: !!selectedNFTAvatar,
      nftId: selectedNFTAvatar?.id,
      nftName: selectedNFTAvatar?.name
    });
  }, [selectedNFTAvatar]);
  
  // State
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isOffline] = useState(false); // Use real API
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showTipSuccessModal, setShowTipSuccessModal] = useState(false);
  const [tipSuccessData, setTipSuccessData] = useState<{ amount: number; username: string } | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [quotedText, setQuotedText] = useState<string>('');
  const [quotedUsername, setQuotedUsername] = useState<string>('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newReplyContent, setNewReplyContent] = useState('');
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());
  const { posts, setPosts, loading: postsLoading, refetch } = useLoadPosts();
  const [refreshing, setRefreshing] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [showingSubcategories, setShowingSubcategories] = useState(false);
  const [hideSponsoredPosts, setHideSponsoredPosts] = useState(false);
  const [updateCounter, setUpdateCounter] = useState(0); // Force re-renders
  const [likingPosts, setLikingPosts] = useState<Set<string | number>>(new Set());
  const [isCreatingPost, setIsCreatingPost] = useState(false); // Track posts being liked
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  // Demo instructions removed for production
  
  // Reply sorting state - track sorting preference per post
  const [replySortPreferences, setReplySortPreferences] = useState<Record<number, ReplySortType>>({});
  
  // Current user wallet comes from wallet context
  const currentUserWallet = walletAddress || 'loading...';
  
  // FlatList ref for scroll to top functionality
  const flatListRef = useRef<FlatList>(null);
  
  // Scroll position tracking for header collapse
  const [scrollY, setScrollY] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const HEADER_COLLAPSE_THRESHOLD = 80;
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Setup notifications on component mount
  useEffect(() => {
    registerForPushNotificationsAsync();
    const cleanupListeners = setupNotificationListeners();
    
    // Load sponsored posts preference
    loadHideSponsoredPreference();
    
    // Test backend connection
    testBackendConnection();
    
    // Test Cloudinary connection for image issues
    import('../../utils/imageUpload').then(({ testCloudinaryConnection }) => {
      testCloudinaryConnection().then(isConnected => {
        if (!isConnected) {
          logger.error('⚠️ Cloudinary connection test failed - images may not load properly');
        } else {
          logger.log('✅ Cloudinary connection test passed');
        }
      });
    });
    
    // Setup global scroll to top function
    global.scrollToTop = () => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };
    
    // Setup global reset to general function
    global.resetToGeneral = () => {
      setActiveTab('all');
      setSelectedCategory(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };
    
    return () => {
      cleanupListeners();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      // Cleanup global functions
      global.scrollToTop = undefined;
      global.resetToGeneral = undefined;
    };
  }, []);
  
  // Setup global refresh feed function in a separate effect
  useEffect(() => {
    global.refreshFeed = () => {
      refetch();
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };
    
    return () => {
      global.refreshFeed = undefined;
    };
  }, [refetch]);

  const loadHideSponsoredPreference = async () => {
    try {
      const savedHideSponsored = await SecureStore.getItemAsync(HIDE_SPONSORED_KEY);
      if (savedHideSponsored === 'true') {
        setHideSponsoredPosts(true);
      } else {
        setHideSponsoredPosts(false);
      }
      
    } catch (error) {
      logger.error('Error loading preferences:', error);
    }
  };

  // Save recently expanded posts
  const saveRecentlyExpanded = async (postIds: number[]) => {
    try {
      await AsyncStorage.setItem(RECENTLY_EXPANDED_KEY, JSON.stringify(postIds));
    } catch (error) {
      logger.error('Error saving recently expanded posts:', error);
    }
  };

  // Load recently expanded posts and fetch their replies
  const loadRecentlyExpanded = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(RECENTLY_EXPANDED_KEY);
      if (saved) {
        const postIds = JSON.parse(saved) as number[];
        // Fetch replies for these posts
        for (const postId of postIds) {
          const post = posts.find(p => {
            const pId = typeof p.id === 'string' ? parseInt(p.id) : p.id;
            return pId === postId;
          });
          
          if (post && post.replyCount && post.replyCount > 0) {
            try {
              await fetchAllReplies(postId);
              // Also add to expandedPosts so they appear expanded
              setExpandedPosts(prev => new Set(prev).add(postId));
            } catch (error) {
              logger.error(`Failed to load replies for recently expanded post ${postId}:`, error);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error loading recently expanded posts:', error);
    }
  }, [posts, fetchAllReplies]);

  // Load hide sponsored preference when premium status changes
  useEffect(() => {
    if (isPremium) {
      loadHideSponsoredPreference();
    } else {
      // If user loses premium, ensure sponsored posts are shown
      setHideSponsoredPosts(false);
    }
  }, [isPremium]);

  // Reload preference when screen comes into focus (returning from settings)
  useFocusEffect(
    useCallback(() => {
      loadHideSponsoredPreference();
    }, [])
  );

  // Load recently expanded posts when posts are loaded
  useEffect(() => {
    if (posts.length > 0 && !postsLoading) {
      loadRecentlyExpanded();
    }
  }, [posts.length, postsLoading, loadRecentlyExpanded]);

  // Update collapse state for other UI elements
  useEffect(() => {
    const shouldCollapse = scrollY > HEADER_COLLAPSE_THRESHOLD;
    const shouldExpand = scrollY < HEADER_COLLAPSE_THRESHOLD - 20;
    
    if (shouldCollapse && !headerCollapsed) {
      setHeaderCollapsed(true);
    } else if (shouldExpand && headerCollapsed) {
      setHeaderCollapsed(false);
    }
  }, [scrollY, headerCollapsed]);


  // Handle scroll events
  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    setScrollY(currentScrollY);
    setIsScrolling(true);

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set scroll end after 150ms of no scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150) as any;
  };

  // Reply sorting functions
  const calculateConfidenceScore = (likes: number, tips: number, replyCount: number): number => {
    // Wilson score confidence interval calculation (simplified)
    const totalVotes = likes + 1; // +1 to avoid division by zero
    const upvotes = likes;
    const n = totalVotes;
    const p = upvotes / n;
    
    // 95% confidence interval lower bound
    const z = 1.96; // 95% confidence
    const left = p + z * z / (2 * n);
    const right = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n);
    const under = 1 + z * z / n;
    
    const score = (left - right) / under;
    
    // Boost score for tips and replies (engagement indicators)
    const engagementBoost = (tips * 0.5) + (replyCount * 0.3);
    
    return Math.max(0, score + engagementBoost);
  };

  const sortReplies = (replies: Reply[], sortType: ReplySortType): Reply[] => {
    if (sortType === 'recent') {
      return [...replies].sort((a, b) => b.id - a.id); // Most recent first
    }
    
    // "Best" sort: confidence score based on likes, tips, and engagement
    return [...replies].sort((a, b) => {
      const scoreA = calculateConfidenceScore(a.likes, a.tips, a.replies?.length || 0);
      const scoreB = calculateConfidenceScore(b.likes, b.tips, b.replies?.length || 0);
      
      if (scoreB === scoreA) {
        // If scores are equal, prefer more recent
        return b.id - a.id;
      }
      
      return scoreB - scoreA;
    });
  };

  const getReplySortType = (postId: number): ReplySortType => {
    return replySortPreferences[postId] || 'best'; // Default to 'best'
  };

  const toggleReplySorting = (postId: number) => {
    setReplySortPreferences(prev => ({
      ...prev,
      [postId]: prev[postId] === 'best' ? 'recent' : 'best'
    }));
  };

  // Handlers

  // Navigation to subcategory feeds
  const handleCategoryChange = (category: string | null) => {
    // Filter posts by category
    setActiveTab(category ? category.toLowerCase() : 'all');
    setSelectedCategory(category);
    // Reset scroll position
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // Pull to refresh handler
  const onRefresh = async () => {
    // Only trigger refresh if user is at the top and not in a layout transition
    if (scrollY < 20 && !isScrolling) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setRefreshing(true);
      
      try {
        await refetch(); // Use the API to fetch posts
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showAlert({
          title: 'Refreshed',
          message: 'Feed updated!',
          type: 'success'
        });
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        showAlert({
          title: 'Error',
          message: errorMessage,
          type: 'error'
        });
      } finally {
        setRefreshing(false);
      }
    }
  };

  const handleCreatePost = async (mediaUrl?: string) => {
    logger.info('handleCreatePost called', { 
      hasContent: !!newPostContent.trim(), 
      isCreatingPost, 
      contentLength: newPostContent.length,
      hasMedia: !!mediaUrl
    });
    
    if (newPostContent.trim() && !isCreatingPost) {
      try {
        // Prevent multiple submissions
        setIsCreatingPost(true);
        logger.info('Creating post...', { content: newPostContent.substring(0, 50) });
        
        // Check if user is authenticated first
        if (!walletAddress) {
          showAlert({
            title: 'Not Connected',
            message: 'Please connect your wallet first',
            type: 'error'
          });
          setIsCreatingPost(false);
          return;
        }
        
        // Check if we have an auth token
        const { hasAuthToken, getAuthToken } = await import('../../utils/api');
        const hasToken = await hasAuthToken();
        const token = await getAuthToken();
        logger.info('Auth token check:', { hasToken, tokenLength: token?.length });
        
        if (!hasToken) {
          showAlert({
            title: 'Authentication Required',
            message: 'Please reconnect your wallet to continue',
            type: 'error'
          });
          setIsCreatingPost(false);
          return;
        }

        // Determine if the media is a video based on file extension
        const isVideo = mediaUrl && (
          mediaUrl.toLowerCase().endsWith('.mp4') || 
          mediaUrl.toLowerCase().endsWith('.mov') ||
          mediaUrl.toLowerCase().endsWith('.avi') ||
          mediaUrl.toLowerCase().includes('video')
        );
        
        // Create post via API
        logger.info('Calling API to create post');
        const response = await postsAPI.createPost({
          content: newPostContent,
          imageUrl: isVideo ? undefined : mediaUrl,
          videoUrl: isVideo ? mediaUrl : undefined,
        });

        // Transform backend post to app format
        const backendPost = response.post;
        
        // Debug log premium status
        logger.info('Creating new post with premium status:', {
          walletIsPremium: isPremium,
          backendTier: backendPost.author?.tier,
          finalIsPremium: isPremium
        });
        
        const newPost: PostType = {
          id: backendPost.id,
          wallet: backendPost.authorWallet || backendPost.author?.walletAddress || currentUserWallet,
          avatar: selectedNFTAvatar ? (selectedNFTAvatar.image || selectedNFTAvatar.uri) : selectedAvatar, // Store current avatar with post
          time: 'Just now',
          timestamp: new Date().toISOString(),
          content: backendPost.content,
          likes: backendPost.likeCount || 0,
          replies: [],
          tips: backendPost.tipCount || 0,
          liked: false,
          imageUrl: backendPost.imageUrl || (isVideo ? undefined : mediaUrl),
          videoUrl: backendPost.videoUrl || (isVideo ? mediaUrl : undefined),
          isPremium: isPremium, // Always use the wallet's premium status
          userTheme: colors.primary,
          gameData: undefined
        };

        // Save avatar to cache for this post
        const avatarToSave = selectedNFTAvatar ? (selectedNFTAvatar.image || selectedNFTAvatar.uri) : selectedAvatar;
        if (avatarToSave) {
          await postAvatarCache.saveAvatar(String(newPost.id), newPost.wallet, avatarToSave);
        }
        
        setPosts([newPost, ...posts]);
        setNewPostContent('');
        setShowCreatePost(false);
        
        // Track reputation for post creation
        if (walletAddress) {
          await reputationService.onPostCreated(walletAddress, !!mediaUrl);
        }
        
        showAlert({
          title: 'Success',
          message: 'Your post has been shared with the community!',
          type: 'success'
        });
      } catch (error) {
        logger.error('Failed to create post:', error);
        const errorMessage = getErrorMessage(error);
        showAlert({
          title: 'Error',
          message: errorMessage,
          type: 'error'
        });
      } finally {
        setIsCreatingPost(false);
        logger.info('Post creation complete');
      }
    } else {
      logger.warn('Skipping post creation', { 
        hasContent: !!newPostContent.trim(), 
        isCreatingPost 
      });
    }
  };

  const handleCreateGame = (gameData: { type: GameType; wager: number }) => {
    // Check if user has sufficient balance for the wager
    if (gameData.wager > balance) {
      showAlert({
        title: 'Insufficient Funds',
        message: `You need ${gameData.wager} $ALLY to create this game. Your balance is ${balance.toFixed(2)} $ALLY.`,
        type: 'error'
      });
      return;
    }

    const gameContent = gameData.type === 'tictactoe' 
      ? `Let's play Tic Tac Toe! Wager: ${gameData.wager} $ALLY`
      : gameData.type === 'rps'
      ? `Rock Paper Scissors challenge! Wager: ${gameData.wager} $ALLY`
      : gameData.type === 'connect4'
      ? `Connect Four challenge - get 4 in a row! Wager: ${gameData.wager} $ALLY`
      : `Coin Flip game! Wager: ${gameData.wager} $ALLY`;

    // Generate a unique ID for the game
    const gameId = Date.now() + Math.floor(Math.random() * 1000);
    
    const newPost: PostType = {
      id: gameId,
      wallet: currentUserWallet,
      avatar: selectedNFTAvatar ? (selectedNFTAvatar.image || selectedNFTAvatar.uri) : selectedAvatar, // Store current avatar with post
      time: 'now',
      content: gameContent,
      likes: 0,
      replies: [],
      tips: 0,
      liked: false,
      category: 'GAMES',
      isPremium: isPremium,
      userTheme: colors.primary,
      gameData: {
        type: gameData.type,
        wager: gameData.wager,
        player1: currentUserWallet,
        player2: null,
        status: 'waiting',
        board: gameData.type === 'tictactoe' ? [
          [null, null, null],
          [null, null, null],
          [null, null, null]
        ] : gameData.type === 'connect4' ? Array(6).fill(null).map(() => Array(7).fill(null)) : undefined,
        currentPlayer: currentUserWallet,
        winner: null,
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000 // 5 minutes
      }
    };

    setPosts([newPost, ...posts]);
    addGamePost(newPost); // Add to game context
    deductBalance(gameData.wager);
    showAlert({
      title: 'Game Created!',
      message: 'Your game has been created. Waiting for an opponent to join!',
      type: 'success'
    });
  };

  const handleCreateReply = async (imageUrl?: string, videoUrl?: string) => {
    if (newReplyContent.trim() && selectedPostId) {
      try {
        let replyContent = newReplyContent;

        // Add quote if replying to a specific comment
        if (quotedText && quotedUsername) {
          replyContent = `> "${quotedText}"\n\n${newReplyContent}`;
        }

        // Call the API to create the reply
        const response = await repliesAPI.createReply(String(selectedPostId), {
          content: replyContent,
          imageUrl,
          videoUrl
        });

        // Transform the backend reply to match frontend format
        const newReply: Reply = {
          id: response.reply.id,
          wallet: response.reply.authorWallet || walletAddress || '',
          username: response.reply.author?.snsUsername || undefined,
          avatar: response.reply.author?.nftAvatar || undefined,
          time: new Date(response.reply.createdAt).toLocaleDateString(),
          timestamp: response.reply.createdAt,
          content: response.reply.content,
          postId: parseInt(String(selectedPostId)),
          likes: 0,
          liked: false,
          tips: 0,
          replies: [],
          isPremium: isPremium, // Use current user's premium status for their own replies
          userTheme: colors.primary,
          imageUrl: response.reply.imageUrl || imageUrl,
          videoUrl: response.reply.videoUrl || videoUrl
        };
        
        const post = posts.find(p => p.id === selectedPostId);

        setPosts(posts.map(post =>
          post.id === selectedPostId
            ? { 
                ...post, 
                replies: [...post.replies, newReply],
                replyCount: (post.replyCount || 0) + 1
              }
            : post
        ));

        setExpandedPosts(prev => {
          const newSet = new Set([...prev, selectedPostId]);
          // Save to recently expanded posts
          const expandedArray = Array.from(newSet);
          const recentlyExpanded = expandedArray.slice(-MAX_RECENTLY_EXPANDED);
          saveRecentlyExpanded(recentlyExpanded);
          return newSet;
        });
        setNewReplyContent('');
        setQuotedText('');
        setQuotedUsername('');
        setShowReplyModal(false);
        
        // Track reputation for comments
        if (walletAddress) {
          await reputationService.onCommentMade(walletAddress);
          if (post && post.wallet !== walletAddress) {
            await reputationService.onCommentReceived(post.wallet);
          }
        }
        
        // Keep selectedPostId so user can reply multiple times to the same post
        showAlert({
          title: 'Success',
          message: 'Your reply has been posted!',
          type: 'success'
        });
      } catch (error: any) {
        logger.error('Failed to create reply:', error);
        const errorMessage = getErrorMessage(error);
        showAlert({
          title: 'Error',
          message: errorMessage,
          type: 'error'
        });
      }
    }
  };

  const handleLike = async (postId: number | string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const post = posts.find(p => String(p.id) === String(postId));
    if (!post) {
      logger.error('Post not found:', postId);
      return;
    }
    
    const wasLiked = post.liked;
    const originalLikes = post.likes;
    logger.log('Like action - Post:', postId, 'Currently liked:', wasLiked, 'Likes:', originalLikes);
    
    // Immediately update UI (Twitter-style optimistic update)
    setPosts(prevPosts => prevPosts.map(p => {
      if (String(p.id) === String(postId)) {
        return {
          ...p,
          liked: !p.liked,
          likes: p.liked ? p.likes - 1 : p.likes + 1
        };
      }
      return p;
    }));
    
    // Fire and forget - send API request in background
    interactionsAPI.likePost(String(postId))
      .then(response => {
        logger.log('Like API response:', response);
        
        // Only update if server response differs from optimistic update
        if (response.liked !== !wasLiked) {
          setPosts(prevPosts => prevPosts.map(p =>
            String(p.id) === String(postId)
              ? { ...p, liked: response.liked }
              : p
          ));
        }
        
        // Track reputation
        if (walletAddress && !wasLiked && response.liked) {
          reputationService.onLikeGiven(walletAddress);
          if (post.wallet !== walletAddress) {
            reputationService.onLikeReceived(post.wallet);
          }
        }
      })
      .catch(error => {
        logger.error('Like API failed:', error);
        
        // Revert optimistic update on error
        setPosts(prevPosts => prevPosts.map(p =>
          String(p.id) === String(postId)
            ? { ...p, liked: wasLiked, likes: originalLikes }
            : p
        ));
        
        showAlert({
          title: 'Error',
          message: 'Failed to update like. Please try again.',
          type: 'error'
        });
      });
  };

  const handleLikeReply = async (postId: number, replyId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Optimistically update UI immediately
    setPosts(prevPosts => prevPosts.map(post =>
      post.id === postId
        ? {
            ...post,
            replies: updateReplyLikes(post.replies, replyId)
          }
        : post
    ));

    // Fire and forget the API call - no awaiting, no reverting
    repliesAPI.likeReply(String(replyId)).catch(error => {
      logger.error('Failed to like reply:', error);
      // Don't revert the UI - keep the optimistic update
    });
  };

  const updateReplyLikes = (replies: Reply[], targetId: number): Reply[] => {
    return replies.map(reply => {
      if (reply.id === targetId) {
        return {
          ...reply,
          liked: !reply.liked,
          likes: reply.liked ? reply.likes - 1 : reply.likes + 1
        };
      }
      if (reply.replies && reply.replies.length > 0) {
        return { ...reply, replies: updateReplyLikes(reply.replies, targetId) };
      }
      return reply;
    });
  };

  const handleReply = (postId: number, quotedReplyText?: string, quotedReplyUsername?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPostId(postId);
    if (quotedReplyText && quotedReplyUsername) {
      // Limit quote length to avoid overly long quotes
      const maxQuoteLength = 100;
      let limitedQuote = quotedReplyText;
      if (quotedReplyText.length > maxQuoteLength) {
        limitedQuote = quotedReplyText.substring(0, maxQuoteLength) + '...';
      }
      setQuotedText(limitedQuote);
      setQuotedUsername(quotedReplyUsername);
    } else {
      setQuotedText('');
      setQuotedUsername('');
    }
    setShowReplyModal(true);
  };

  const handleTipReply = (postId: number, replyId: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPosts(prevPosts => prevPosts.map(post =>
      post.id === postId
        ? {
            ...post,
            replies: updateReplyTips(post.replies, replyId)
          }
        : post
    ));
    showAlert({
      title: 'Success',
      message: 'Tip sent! 💰',
      type: 'success'
    });
  };

  const updateReplyTips = (replies: Reply[], targetId: number): Reply[] => {
    return replies.map(reply => {
      if (reply.id === targetId) {
        return { ...reply, tips: reply.tips + 1 };
      }
      if (reply.replies && reply.replies.length > 0) {
        return { ...reply, replies: updateReplyTips(reply.replies, targetId) };
      }
      return reply;
    });
  };


  const toggleReplies = async (postId: number) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
        
        // Fetch all replies for this post when expanding
        fetchAllReplies(postId);
        
        // Save to recently expanded posts
        const expandedArray = Array.from(newSet);
        const recentlyExpanded = expandedArray.slice(-MAX_RECENTLY_EXPANDED);
        saveRecentlyExpanded(recentlyExpanded);
      }
      return newSet;
    });
  };

  const fetchAllReplies = useCallback(async (postId: number) => {
    try {
      const response = await repliesAPI.getReplies(String(postId));
      
      if (response.replies && response.replies.length > 0) {
        // Transform backend replies to frontend format
        const transformedReplies = response.replies.map((reply: any) => ({
          id: reply.id,
          wallet: reply.authorWallet || (reply.author && reply.author.walletAddress) || 'Unknown',
          username: reply.author && reply.author.snsUsername ? reply.author.snsUsername : undefined,
          avatar: reply.author && reply.author.nftAvatar ? reply.author.nftAvatar : undefined,
          time: new Date(reply.createdAt).toLocaleDateString(),
          content: reply.content,
          likes: reply.likeCount || 0,
          liked: false, // TODO: Check if user liked this reply
          tips: reply.tipCount || 0,
          replies: [], // Nested replies not supported yet
          isPremium: reply.author && reply.author.tier === 'premium',
          userTheme: undefined
        }));
        
        // Update the post with all replies
        setPosts(prevPosts => prevPosts.map(post =>
          post.id === postId
            ? { ...post, replies: transformedReplies, replyCount: transformedReplies.length }
            : post
        ));
      }
    } catch (error: any) {
      logger.error('Failed to fetch replies:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to load replies',
        type: 'error'
      });
    }
  }, [setPosts, showAlert]);


  const handleShowTipModal = (postId: number) => {
    setSelectedPostId(postId);
    setShowTipModal(true);
  };

  const handleReport = async (postId: number) => {
    try {
      // Optimistically update UI - mark post as reported by current user
      setPosts(prevPosts => prevPosts.map(post =>
        post.id === postId
          ? { 
              ...post, 
              reportedBy: [...(post.reportedBy || []), currentUserWallet],
              reportCount: (post.reportCount || 0) + 1
            }
          : post
      ));

      showAlert({
        title: 'Post Reported',
        message: 'Thank you for reporting this post. Our moderation team will review it.',
        type: 'success'
      });

      // TODO: Call backend API to report post
      // await postsAPI.reportPost(String(postId));
      
      // If a post has 3+ reports, it should be hidden
      const updatedPost = posts.find(p => p.id === postId);
      if (updatedPost && (updatedPost.reportCount || 0) >= 2) {
        // Hide the post after 3 reports (including this one)
        setTimeout(() => {
          setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
        }, 1000);
      }
    } catch (error) {
      logger.error('Failed to report post:', error);
      showAlert({
        title: 'Report Failed',
        message: 'Unable to report this post. Please try again.',
        type: 'error'
      });
    }
  };

  const handleShowProfile = (wallet: string) => {
    router.push({
      pathname: '/profile',
      params: { wallet }
    });
  };

  const handleShowReportModal = (postId: number) => {
    setSelectedPostId(postId);
    setShowReportModal(true);
  };

  const handleConfirmReport = () => {
    if (selectedPostId) {
      handleReport(selectedPostId);
    }
  };

  const handleTip = async (postId: number, amount: number) => {
    // Check if user has sufficient balance
    if (amount > balance) {
      showAlert({
        title: 'Insufficient Funds',
        message: `You only have ${balance.toFixed(2)} $ALLY in your wallet. Please enter a smaller amount.`,
        type: 'info'
      });
      return;
    }

    try {
      // Optimistically update UI
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Deduct from wallet balance
      deductBalance(amount);
      
      // Update post tips optimistically
      setPosts(prevPosts => prevPosts.map(post =>
        post.id === postId
          ? { ...post, tips: post.tips + amount }
          : post
      ));

      // Show tip success modal
      const post = posts.find(p => p.id === postId);
      if (post) {
        setTipSuccessData({ amount, username: post.wallet });
        setShowTipSuccessModal(true);
        setShowTipModal(false); // Close the tip modal
      }

      // Call API in background
      const response = await interactionsAPI.tipPost(String(postId), amount);
      
      // If API call fails, revert the changes
      if (!response.success) {
        throw new Error(response.error || 'Failed to process tip');
      }
      
      // Track reputation for tips
      if (walletAddress) {
        await reputationService.onTipSent(walletAddress, amount);
        if (post && post.wallet !== walletAddress) {
          await reputationService.onTipReceived(post.wallet, amount);
        }
      }
    } catch (error) {
      logger.error('Failed to tip post:', error);
      
      // Revert the optimistic updates
      setPosts(prevPosts => prevPosts.map(post =>
        post.id === postId
          ? { ...post, tips: post.tips - amount }
          : post
      ));
      
      // Refund the balance
      deductBalance(-amount); // This adds the amount back
      
      showAlert({
        title: 'Tip Failed',
        message: 'Unable to process your tip. Please try again.',
        type: 'error'
      });
    }
  };



  // Filter posts based on user preferences
  const filteredPosts = posts.filter(post => {
    // If user has premium and wants to hide sponsored posts, filter them out
    if (isPremium && hideSponsoredPosts && post.sponsored) {
      return false;
    }
    // Always hide game posts from the feed - they're now in the gaming tab
    if (post.gameData) {
      return false;
    }
    return true;
  });

  // Sort posts by newest first
  const sortedPosts = React.useMemo(() => {
    return [...filteredPosts].sort((a, b) => b.id - a.id);
  }, [filteredPosts]);
  
  // Memoized callbacks for FlatList - must be defined before conditional rendering
  const keyExtractor = useCallback((item: PostType) => String(item.id), []);
  
  const renderItem = useCallback(({ item: post }: { item: PostType }) => (
    <Post
      post={{
        ...post,
        replies: sortReplies(post.replies, getReplySortType(post.id))
      }}
      expandedPosts={expandedPosts}
      currentUserWallet={currentUserWallet}
      currentUserAvatar={selectedAvatar}
      currentUserNFTAvatar={selectedNFTAvatar}
      replySortType={getReplySortType(post.id)}
      onLike={handleLike}
      onReply={handleReply}
      onTip={handleTip}
      onShowTipModal={handleShowTipModal}
      onLikeReply={handleLikeReply}
      onTipReply={handleTipReply}
      onToggleReplies={toggleReplies}
      onToggleReplySorting={toggleReplySorting}
      onReport={handleReport}
      onShowProfile={handleShowProfile}
      onShowReportModal={handleShowReportModal}
    />
  ), [expandedPosts, currentUserWallet, selectedAvatar, selectedNFTAvatar, handleLike, handleReply, handleTip, handleShowTipModal, handleLikeReply, handleTipReply, toggleReplies, toggleReplySorting, handleReport, handleShowProfile, handleShowReportModal, getReplySortType, sortReplies]);
  
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 200, // Estimated height of post
    offset: 200 * index,
    index,
  }), []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* SolMint-Level Phone Background System (NO external particles) */}
        
        {/* Base dark gradient layer (matches SolMint phone background) */}
        <LinearGradient
          colors={gradients.surface}
          style={styles.baseBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {/* Green overlay gradient (simulates SolMint's ::before pseudo-element) */}
        <LinearGradient
          colors={[
            colors.primary + '14',
            colors.secondary + '0C',
            'transparent',
            colors.primary + '0F',
            colors.secondary + '1A',
          ]}
          style={styles.greenOverlay}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
          
        <View style={styles.contentContainer}>
        {activeTab === 'games' ? (
            <View style={styles.gamesViewContainer}>
              <Header 
                onCategoryChange={handleCategoryChange} 
                isCollapsed={false} 
                onProfileClick={() => {
                  // In offline mode, use a mock wallet address
                  const wallet = walletAddress || 'mockWallet1234567890';
                  router.push({
                    pathname: '/profile',
                    params: { wallet: wallet }
                  });
                }}
                selectedCategory={selectedCategory}
              />
              <GamesView
                posts={posts}
                currentUserWallet={currentUserWallet}
                onCreateGame={handleCreateGame}
              />
            </View>
          ) : activeTab === 'events' ? (
            <View style={styles.eventsViewContainer}>
              <Header 
                onCategoryChange={handleCategoryChange} 
                isCollapsed={false} 
                onProfileClick={() => {
                  // In offline mode, use a mock wallet address
                  const wallet = walletAddress || 'mockWallet1234567890';
                  router.push({
                    pathname: '/profile',
                    params: { wallet: wallet }
                  });
                }}
                selectedCategory={selectedCategory}
              />
              <EventsView />
            </View>
          ) : (
          <AnimatedFlatList 
            ref={flatListRef}
            style={styles.content} 
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: 60 + insets.bottom + 20 } // Tab bar height + device bottom + extra padding
            ]}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            ListHeaderComponent={() => (
              <Header 
                onCategoryChange={handleCategoryChange} 
                isCollapsed={false} 
                onProfileClick={() => {
                  // In offline mode, use a mock wallet address
                  const wallet = walletAddress || 'mockWallet1234567890';
                  router.push({
                    pathname: '/profile',
                    params: { wallet: wallet }
                  });
                }}
                selectedCategory={selectedCategory}
              />
            )}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                  progressBackgroundColor={isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)'}
                  progressViewOffset={headerCollapsed ? 60 : 160}
                  enabled={scrollY < 30 && !isScrolling}
                />
              }
              data={sortedPosts}
              ListEmptyComponent={() => {
                if (postsLoading && posts.length === 0) {
                  return <FeedSkeleton count={5} />;
                }
                
                if (feedError) {
                  return (
                    <View style={styles.errorContainer}>
                      <Ionicons name="cloud-offline-outline" size={64} color={colors.textSecondary} />
                      <Text style={[styles.errorTitle, { color: colors.text }]}>Unable to load posts</Text>
                      <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{feedError}</Text>
                      <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={refetch}>
                        <Text style={styles.retryButtonText}>Try Again</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }
                
                return (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                      {activeTab === 'all' ? 'No posts yet' : `No ${activeTab} posts yet`}
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                      {activeTab === 'all' 
                        ? 'Be the first to share something!' 
                        : `Be the first to post in ${activeTab}!`}
                    </Text>
                  </View>
                );
              }}
              keyExtractor={keyExtractor}
              extraData={posts}
              renderItem={renderItem}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={10}
              removeClippedSubviews={true}
              updateCellsBatchingPeriod={50}
              getItemLayout={getItemLayout}
            />
        )}

        {/* Floating Action Button - Only show on non-game tabs */}
        {activeTab !== 'games' && activeTab !== 'events' && (
          <TouchableOpacity
            style={[styles.fab, { shadowColor: colors.shadowColor }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowCreatePost(true);
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={gradients.primary}
              style={styles.fabGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons 
                name="create-outline" 
                size={24} 
                color={isDarkMode ? '#000' : '#fff'} 
              />
            </LinearGradient>
          </TouchableOpacity>
        )}

        <CreatePostModal
          visible={showCreatePost}
          content={newPostContent}
          onClose={() => {
            setShowCreatePost(false);
            setNewPostContent(''); // Clear content when closing
          }}
          onContentChange={setNewPostContent}
          onSubmit={handleCreatePost}
        />

        <ReplyModal
          visible={showReplyModal}
          content={newReplyContent}
          quotedText={quotedText}
          quotedUsername={quotedUsername}
          onClose={() => {
            setShowReplyModal(false);
            setQuotedText('');
            setQuotedUsername('');
          }}
          onContentChange={setNewReplyContent}
          onSubmit={handleCreateReply}
        />

        <TipModal
          visible={showTipModal}
          username={selectedPostId ? posts.find(p => p.id === selectedPostId)?.wallet || '' : ''}
          walletBalance={balance}
          onClose={() => {
            setShowTipModal(false);
            setSelectedPostId(null);
          }}
          onTip={(amount, event) => {
            if (selectedPostId) {
              handleTip(selectedPostId, amount);
            }
          }}
        />


        <ReportModal
          visible={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setSelectedPostId(null);
          }}
          onConfirm={handleConfirmReport}
          postId={selectedPostId || undefined}
        />


        <TipSuccessModal
          visible={showTipSuccessModal}
          onClose={() => {
            setShowTipSuccessModal(false);
            setTipSuccessData(null);
          }}
          amount={tipSuccessData?.amount || 0}
          username={tipSuccessData?.username || ''}
        />

        {/* Demo Instructions Modal - Removed for production */}
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // SolMint-level phone background system (NO particles)
  baseBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Green overlay gradient (simulates SolMint's ::before pseudo-element)
  greenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  contentContainer: {
    flex: 1,
    zIndex: 10,
  },
  statusBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 25,
    zIndex: 2000,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Extra padding for tab bar and FAB
  },
  gamesViewContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.semiBold,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.semiBold,
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
  },
  eventsViewContainer: {
    flex: 1,
  },
  feedContainer: {
    flex: 1,
  },
  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 100, // Above tab bar
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 12,
    zIndex: 1000,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    fontSize: 24,
  },
});