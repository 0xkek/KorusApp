import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';

// Create AnimatedFlatList to support native driver
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
import { useKorusAlert } from '../../components/KorusAlertProvider';
import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import { initialPosts } from '../../data/mockData';
import { Post as PostType, Reply, GameType } from '../../types';
import { registerForPushNotificationsAsync, setupNotificationListeners } from '../../utils/notifications';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logger } from '../../utils/logger';
import { reputationService } from '../../services/reputation';
import { Fonts, FontSizes } from '../../constants/Fonts';
import { useLoadPosts } from '../../hooks/useLoadPosts';
import { postsAPI, authAPI } from '../../utils/api';
import { testBackendConnection } from '../../utils/testApi';

// Global type declaration for scroll to top and reset functions
declare global {
  var scrollToTop: (() => void) | undefined;
  var resetToGeneral: (() => void) | undefined;
}

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

const HIDE_SPONSORED_KEY = 'korus_hide_sponsored_posts';

// Reply sorting types
type ReplySortType = 'best' | 'recent';

export default function HomeScreen() {
  const { colors, isDarkMode, gradients } = useTheme();
  const { showAlert } = useKorusAlert();
  const { walletAddress, balance, deductBalance, selectedAvatar, selectedNFTAvatar, isPremium } = useWallet();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // State
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isOffline] = useState(true); // Offline mode for mock data
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
      const scoreA = calculateConfidenceScore(a.likes, a.tips, a.replies.length);
      const scoreB = calculateConfidenceScore(b.likes, b.tips, b.replies.length);
      
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
        showAlert({
          title: 'Error',
          message: 'Failed to refresh feed',
          type: 'error'
        });
      } finally {
        setRefreshing(false);
      }
    }
  };

  const handleCreatePost = async (category: string, mediaUrl?: string) => {
    if (newPostContent.trim()) {
      try {
        // Check if user is authenticated first
        if (!walletAddress) {
          showAlert({
            title: 'Not Connected',
            message: 'Please connect your wallet first',
            type: 'error'
          });
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
        const response = await postsAPI.createPost({
          content: newPostContent,
          topic: category.toUpperCase(),
          subtopic: category,
          imageUrl: isVideo ? undefined : mediaUrl,
          videoUrl: isVideo ? mediaUrl : undefined,
        });

        // Add the new post to the local state
        const newPost: PostType = {
          id: response.id,
          wallet: currentUserWallet,
          time: 'now',
          content: newPostContent,
          likes: 0,
          replies: [],
          tips: 0,
          liked: false,
          bumped: false,
          bumpedAt: undefined,
          bumpExpiresAt: undefined,
          category: category,
          imageUrl: isVideo ? undefined : mediaUrl,
          videoUrl: isVideo ? mediaUrl : undefined,
          isPremium: isPremium,
          userTheme: colors.primary,
          gameData: undefined
        };

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
        showAlert({
          title: 'Error',
          message: 'Failed to create post. Please try again.',
          type: 'error'
        });
      }
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

    const newPost: PostType = {
      id: posts.length + 1,
      wallet: currentUserWallet,
      time: 'now',
      content: gameContent,
      likes: 0,
      replies: [],
      tips: 0,
      liked: false,
      bumped: false,
      bumpedAt: undefined,
      bumpExpiresAt: undefined,
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
        winner: null
      }
    };

    setPosts([newPost, ...posts]);
    deductBalance(gameData.wager);
    showAlert({
      title: 'Game Created!',
      message: 'Your game has been created. Waiting for an opponent to join!',
      type: 'success'
    });
  };

  const handleCreateReply = async () => {
    if (newReplyContent.trim() && selectedPostId) {
      let replyContent = newReplyContent;

      // Add quote if replying to a specific comment
      if (quotedText && quotedUsername) {
        replyContent = `> "${quotedText}"\n\n${newReplyContent}`;
      }

      const newReply: Reply = {
        id: Date.now(),
        wallet: currentUserWallet,
        time: 'now',
        content: replyContent,
        likes: 0,
        liked: false,
        tips: 0,
        replies: [],
        bumped: false,
        bumpedAt: undefined,
        bumpExpiresAt: undefined,
        isPremium: isPremium,
        userTheme: colors.primary
      };
      
      const post = posts.find(p => p.id === selectedPostId);

      setPosts(posts.map(post =>
        post.id === selectedPostId
          ? { ...post, replies: [...post.replies, newReply] }
          : post
      ));

      setExpandedPosts(prev => new Set([...prev, selectedPostId]));
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
    }
  };

  const handleLike = async (postId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    const wasLiked = post.liked;
    
    setPosts(prevPosts => prevPosts.map(post =>
      post.id === postId
        ? {
            ...post,
            liked: !post.liked,
            likes: post.liked ? post.likes - 1 : post.likes + 1
          }
        : post
    ));
    
    // Track reputation for likes
    if (walletAddress && !wasLiked) {
      await reputationService.onLikeGiven(walletAddress);
      if (post.wallet !== walletAddress) {
        await reputationService.onLikeReceived(post.wallet);
      }
    }
  };

  const handleLikeReply = (postId: number, replyId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPosts(prevPosts => prevPosts.map(post =>
      post.id === postId
        ? {
            ...post,
            replies: updateReplyLikes(post.replies, replyId)
          }
        : post
    ));
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
      if (reply.replies.length > 0) {
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
      if (reply.replies.length > 0) {
        return { ...reply, replies: updateReplyTips(reply.replies, targetId) };
      }
      return reply;
    });
  };


  const toggleReplies = (postId: number) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };


  const handleShowTipModal = (postId: number) => {
    setSelectedPostId(postId);
    setShowTipModal(true);
  };

  const handleReport = (postId: number) => {
    showAlert({
      title: 'Post Reported',
      message: 'Thank you for reporting this post. Our moderation team will review it.',
      type: 'success'
    });
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

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Deduct from wallet balance
    deductBalance(amount);
    
    // Update post tips
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
      
      // Track reputation for tips
      if (walletAddress) {
        await reputationService.onTipSent(walletAddress, amount);
        if (post.wallet !== walletAddress) {
          await reputationService.onTipReceived(post.wallet, amount);
        }
      }
    }
  };



  // Filter posts based on user preferences and category
  const filteredPosts = posts.filter(post => {
    // Filter by category if one is selected
    if (activeTab !== 'all' && post.category?.toLowerCase() !== activeTab) {
      return false;
    }
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
        {/* Status bar background overlay */}
        <LinearGradient
          colors={isDarkMode ? [
            'rgba(20, 20, 20, 0.98)',
            'rgba(25, 25, 25, 0.95)',
            'rgba(30, 30, 30, 0.85)',
            'transparent'
          ] : [
            'rgba(253, 255, 254, 0.98)',
            'rgba(248, 250, 249, 0.95)',
            'rgba(242, 246, 243, 0.85)',
            'transparent'
          ]}
          style={styles.statusBarOverlay}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        
        
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
              ListEmptyComponent={() => (
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
              )}
              keyExtractor={(item) => {
                // Include game state in key for game posts to force re-render
                if (item.gameData) {
                  if (item.gameData.type === 'tictactoe' && item.gameData.board) {
                    const boardState = item.gameData.board.flat().map(cell => cell || '_').join('');
                    return `${item.id}-ttt-${item.gameData.status}-${item.gameData.player2 || 'none'}-${boardState}`;
                  }
                  return `${item.id}-${item.gameData.type}-${item.gameData.status}-${item.gameData.player2 || 'none'}`;
                }
                return item.id.toString();
              }}
              extraData={[posts, expandedPosts, updateCounter]}
              renderItem={({ item: post }) => (
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
              )}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={10}
              removeClippedSubviews={true}
              updateCellsBatchingPeriod={50}
              getItemLayout={(data, index) => ({
                length: 200, // Estimated height of post
                offset: 200 * index,
                index,
              })}
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
          onClose={() => setShowCreatePost(false)}
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
    height: 50,
    zIndex: 2000,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding for tab bar and FAB
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