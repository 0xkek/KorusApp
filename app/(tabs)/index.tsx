import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Global type declaration for scroll to top function
declare global {
  var scrollToTop: (() => void) | undefined;
}
import { useKorusAlert } from '../../components/KorusAlertProvider';
import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import { initialPosts, subtopicData } from '../../data/mockData';
import { Post as PostType, Reply, GameType } from '../../types';
import { registerForPushNotificationsAsync, setupNotificationListeners } from '../../utils/notifications';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logger } from '../../utils/logger';

// Components
import CreatePostModal from '../../components/CreatePostModal';
import Header from '../../components/Header';
import MyProfileModal from '../../components/MyProfileModal';
import ParticleSystem from '../../components/ParticleSystem';
import Post from '../../components/Post';
import ProfileModal from '../../components/ProfileModal';
import ReplyModal from '../../components/ReplyModal';
import ReportModal from '../../components/ReportModal';
import TipModal from '../../components/TipModal';

const HIDE_SPONSORED_KEY = 'korus_hide_sponsored_posts';
const HIDE_GAME_POSTS_KEY = 'korus_hide_game_posts';

// Reply sorting types
type ReplySortType = 'best' | 'recent';

export default function HomeScreen() {
  const { colors, isDarkMode, gradients } = useTheme();
  const { showAlert } = useKorusAlert();
  const { walletAddress, balance, deductBalance, selectedAvatar, selectedNFTAvatar, isPremium } = useWallet();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // State
  const [activeTab, setActiveTab] = useState('career');
  const [activeSubtopic, setActiveSubtopic] = useState('Job Search');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMyProfileModal, setShowMyProfileModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [quotedText, setQuotedText] = useState<string>('');
  const [quotedUsername, setQuotedUsername] = useState<string>('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newReplyContent, setNewReplyContent] = useState('');
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());
  const [posts, setPosts] = useState<PostType[]>(initialPosts);
  const [refreshing, setRefreshing] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [showingSubcategories, setShowingSubcategories] = useState(false);
  const [hideSponsoredPosts, setHideSponsoredPosts] = useState(false);
  const [hideGamePosts, setHideGamePosts] = useState(false);
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
    
    // Setup global scroll to top function
    global.scrollToTop = () => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };
    
    return () => {
      cleanupListeners();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      // Cleanup global function
      global.scrollToTop = undefined;
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
      
      const savedHideGamePosts = await SecureStore.getItemAsync(HIDE_GAME_POSTS_KEY);
      if (savedHideGamePosts === 'true') {
        setHideGamePosts(true);
      } else {
        setHideGamePosts(false);
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

  // Handle header collapse with hysteresis to prevent flicker
  useEffect(() => {
    const shouldCollapse = scrollY > HEADER_COLLAPSE_THRESHOLD;
    const shouldExpand = scrollY < HEADER_COLLAPSE_THRESHOLD - 20; // 20px hysteresis
    
    if (shouldCollapse && !headerCollapsed) {
      setHeaderCollapsed(true);
    } else if (shouldExpand && headerCollapsed) {
      setHeaderCollapsed(false);
    }
  }, [scrollY, headerCollapsed]);

  // Handle scroll events with debouncing
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
  const handleTabPress = (topic: string) => {
    setActiveTab(topic);
    setActiveSubtopic(subtopicData[topic][0]);
  };

  const handleSubtopicPress = (subtopic: string) => {
    setActiveSubtopic(subtopic);
  };

  // Navigation to subcategory feeds
  const handleCategoryChange = (category: string | null, subcategory: string | null) => {
    if (subcategory && category) {
      // Navigate to subcategory feed
      router.push({
        pathname: '/subcategory-feed' as any,
        params: {
          category,
          subcategory
        }
      });
    } else {
      // Handle category selection (show subcategories) - keep existing logic
      if (category) {
        setActiveTab(category.toLowerCase());
        setActiveSubtopic(''); // Reset subcategory when changing categories
      }
    }
  };

  // Pull to refresh handler
  const onRefresh = async () => {
    // Only trigger refresh if user is at the top and not in a layout transition
    if (scrollY < 20 && !isScrolling) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setRefreshing(true);
      // Simulate network delay
      setTimeout(() => {
        // In a real app, you'd fetch new posts from the server
        // For now, we'll just reset to initial posts to simulate refresh
        setPosts([...initialPosts]);
        setRefreshing(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showAlert({
          title: 'Refreshed',
          message: 'Feed updated!',
          type: 'success'
        });
      }, 1000);
    }
  };

  const handleCreatePost = (category: string, subcategory: string, imageUrl?: string, gameData?: { type: GameType; wager: number }) => {
    if (newPostContent.trim() || gameData) {
      const newPost: PostType = {
        id: posts.length + 1,
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
        subcategory: subcategory,
        imageUrl: imageUrl,
        isPremium: isPremium,
        userTheme: colors.primary,
        gameData: gameData ? {
          type: gameData.type,
          wager: gameData.wager,
          player1: currentUserWallet,
          status: 'waiting',
          createdAt: Date.now(),
          expiresAt: Date.now() + (30 * 60 * 1000), // 30 minutes
          board: gameData.type === 'tictactoe' ? [[null, null, null], [null, null, null], [null, null, null]] : null
        } : undefined
      };

      setPosts([newPost, ...posts]);
      setNewPostContent('');
      setShowCreatePost(false);
      showAlert({
        title: 'Success',
        message: gameData ? 'Game created! Waiting for an opponent...' : 'Your post has been shared with the community!',
        type: 'success'
      });
    }
  };

  const handleCreateReply = () => {
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
      // Keep selectedPostId so user can reply multiple times to the same post
      showAlert({
        title: 'Success',
        message: 'Your reply has been posted!',
        type: 'success'
      });
    }
  };

  const handleLike = (postId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPosts(posts.map(post =>
      post.id === postId
        ? {
            ...post,
            liked: !post.liked,
            likes: post.liked ? post.likes - 1 : post.likes + 1
          }
        : post
    ));
  };

  const handleLikeReply = (postId: number, replyId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPosts(posts.map(post =>
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
    setPosts(posts.map(post =>
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

  // Remove reply bumping functionality based on research
  const handleBumpReply = (replyId: number) => {
    // No longer needed - removed based on UX research
    showAlert({
      title: 'Note',
      message: 'Reply interactions use likes and tips instead of bumping for better conversation flow!',
      type: 'info'
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

  // Check if bump is still active (5-minute duration)
  const isBumpActive = (post: PostType): boolean => {
    if (!post.bumped || !post.bumpedAt || !post.bumpExpiresAt) return false;
    return Date.now() < post.bumpExpiresAt;
  };

  const handleBump = (postId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const targetPost = posts.find(p => p.id === postId);
    const isCurrentlyBumped = targetPost && isBumpActive(targetPost);
    
    if (!isCurrentlyBumped) {
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return { 
            ...post, 
            bumped: true, 
            bumpedAt: Date.now(),
            bumpExpiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
          };
        }
        return post;
      }));
      
      showAlert({
        title: 'Bump',
        message: 'Post bumped for 5 minutes! ⬆️',
        type: 'bump'
      });
    }
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
    setSelectedWallet(wallet);
    setShowProfileModal(true);
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

  const handleTip = (postId: number, amount: number) => {
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
    setPosts(posts.map(post =>
      post.id === postId
        ? { ...post, tips: post.tips + amount }
        : post
    ));
  };

  const handleJoinGame = (postId: number) => {
    setPosts(prevPosts => {
      const post = prevPosts.find(p => p.id === postId);
      if (!post || !post.gameData) {
        return prevPosts;
      }

      // Check if user has sufficient balance
      if (post.gameData.wager > balance) {
        showAlert({
          title: 'Insufficient Funds',
          message: `You need ${post.gameData.wager} $ALLY to join this game. Your balance is ${balance.toFixed(2)} $ALLY.`,
          type: 'error'
        });
        return prevPosts;
      }

      // Update game data
      const updatedPosts = prevPosts.map(p => {
        if (p.id === postId && p.gameData) {
          // Create a completely new gameData object
          const updatedGameData = {
            ...p.gameData,
            player2: currentUserWallet,
            status: 'active' as const,
            currentPlayer: currentUserWallet // For testing, let player2 go first since player1 is mock
          };
          
          // Initialize game-specific data
          if (p.gameData.type === 'rps') {
            updatedGameData.rounds = [];
            updatedGameData.currentRound = 1;
          } else if (p.gameData.type === 'coinflip') {
            updatedGameData.player1Choice = null;
            updatedGameData.player2Choice = null;
            updatedGameData.result = null;
          }
          
          // Return a new post object with updated gameData
          return {
            ...p,
            gameData: updatedGameData
          };
        }
        return p;
      });

      showAlert({
        title: 'Game Joined!',
        message: 'You have successfully joined the game. Good luck!',
        type: 'success'
      });
      
      return updatedPosts;
    });
    
    // Deduct wager from wallet balance AFTER updating posts
    const post = posts.find(p => p.id === postId);
    if (post?.gameData) {
      deductBalance(post.gameData.wager);
    }
    
    // Force a re-render
    setUpdateCounter(prev => prev + 1);
  };

  const handleGameMove = (postId: number, moveData: any, moveType?: string) => {
    // Handle TicTacToe moves (row, col as separate params)
    if (typeof moveData === 'number' && typeof moveType === 'number') {
      const row = moveData;
      const col = moveType;
      return handleTicTacToeMove(postId, row, col);
    }
    
    // Handle new game moves

    setPosts(prevPosts => {
      const updatedPosts = prevPosts.map(p => {
        if (p.id === postId && p.gameData) {
          // Handle Rock Paper Scissors
          if (p.gameData.type === 'rps' && moveType === 'rps') {
            const isPlayer1 = currentUserWallet?.toLowerCase() === p.gameData.player1?.toLowerCase();
            const currentRound = p.gameData.currentRound || 1;
            const rounds = p.gameData.rounds || [];
            
            // Create the current round if it doesn't exist
            if (!rounds[currentRound - 1]) {
              rounds[currentRound - 1] = {};
            }
            
            // Record the move
            if (isPlayer1) {
              rounds[currentRound - 1].player1Choice = moveData;
            } else {
              rounds[currentRound - 1].player2Choice = moveData;
            }
            
            // If both players have chosen, determine the round winner
            if (rounds[currentRound - 1].player1Choice && rounds[currentRound - 1].player2Choice) {
              const p1Choice = rounds[currentRound - 1].player1Choice;
              const p2Choice = rounds[currentRound - 1].player2Choice;
              
              // Determine round winner
              let roundWinner = null;
              if (p1Choice === p2Choice) {
                roundWinner = 'draw';
              } else if (
                (p1Choice === 'rock' && p2Choice === 'scissors') ||
                (p1Choice === 'paper' && p2Choice === 'rock') ||
                (p1Choice === 'scissors' && p2Choice === 'paper')
              ) {
                roundWinner = p.gameData.player1;
              } else {
                roundWinner = p.gameData.player2;
              }
              
              rounds[currentRound - 1].winner = roundWinner;
              
              // Count wins
              const p1Wins = rounds.filter(r => r.winner === p.gameData.player1).length;
              const p2Wins = rounds.filter(r => r.winner === p.gameData.player2).length;
              
              // Check if game is over (best of 3)
              if (p1Wins >= 2 || p2Wins >= 2 || currentRound >= 3) {
                const gameWinner = p1Wins > p2Wins ? p.gameData.player1 : p2Wins > p1Wins ? p.gameData.player2 : 'draw';
                return {
                  ...p,
                  gameData: {
                    ...p.gameData,
                    rounds,
                    currentRound,
                    winner: gameWinner,
                    status: 'completed' as const
                  }
                };
              } else {
                // Continue to next round
                return {
                  ...p,
                  gameData: {
                    ...p.gameData,
                    rounds,
                    currentRound: currentRound + 1,
                    currentPlayer: p.gameData.player1
                  }
                };
              }
            } else {
              // Waiting for other player's choice
              return {
                ...p,
                gameData: {
                  ...p.gameData,
                  rounds,
                  currentPlayer: isPlayer1 ? p.gameData.player2 : p.gameData.player1
                }
              };
            }
          }
          
          // Handle Coin Flip
          if (p.gameData.type === 'coinflip' && moveType === 'coinflip') {
            const isPlayer2 = currentUserWallet?.toLowerCase() === p.gameData.player2?.toLowerCase();
            
            // Only player 2 can make a choice
            if (isPlayer2 && !p.gameData.player2Choice) {
              // Player 2 chooses, player 1 gets the opposite
              const player1Choice = moveData === 'heads' ? 'tails' : 'heads';
              
              // Flip the coin
              const result = Math.random() < 0.5 ? 'heads' : 'tails';
              const winner = player1Choice === result ? p.gameData.player1 : p.gameData.player2;
              
              return {
                ...p,
                gameData: {
                  ...p.gameData,
                  player1Choice,
                  player2Choice: moveData,
                  result,
                  winner,
                  status: 'completed' as const
                }
              };
            }
          }
        }
        return p;
      });
      return updatedPosts;
    });
    // Force a re-render
    setUpdateCounter(prev => prev + 1);
  };
  
  const handleTicTacToeMove = (postId: number, row: number, col: number) => {
    setPosts(prevPosts => {
      const updatedPosts = prevPosts.map(p => {
        if (p.id === postId && p.gameData && p.gameData.type === 'tictactoe') {
          // Deep clone the board
          const board = p.gameData.board.map(boardRow => [...boardRow]);
          const currentSymbol = p.gameData.currentPlayer?.toLowerCase() === p.gameData.player1?.toLowerCase() ? 'X' : 'O';
          
          // Make the move
          board[row][col] = currentSymbol;
          
          // Check for winner
          const winner = checkTicTacToeWinner(board);
          
          // Switch player if no winner
          const nextPlayer = p.gameData.currentPlayer?.toLowerCase() === p.gameData.player1?.toLowerCase() ? p.gameData.player2 : p.gameData.player1;
          
          return {
            ...p,
            gameData: {
              ...p.gameData,
              board,
              currentPlayer: winner ? p.gameData.currentPlayer : nextPlayer,
              status: winner ? 'completed' as const : 'active' as const,
              winner: winner === 'X' ? p.gameData.player1 : winner === 'O' ? p.gameData.player2 : winner === 'draw' ? 'draw' : undefined
            }
          };
        }
        return p;
      });
      return updatedPosts;
    });
    
    // Force a re-render
    setUpdateCounter(prev => prev + 1);
  };

  // Check for Tic Tac Toe winner
  const checkTicTacToeWinner = (board: any[][]): string | null => {
    // Check rows
    for (let i = 0; i < 3; i++) {
      if (board[i][0] && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
        return board[i][0];
      }
    }
    
    // Check columns
    for (let i = 0; i < 3; i++) {
      if (board[0][i] && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
        return board[0][i];
      }
    }
    
    // Check diagonals
    if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
      return board[0][0];
    }
    if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
      return board[0][2];
    }
    
    // Check for draw
    const isDraw = board.every(row => row.every(cell => cell !== null));
    if (isDraw) return 'draw';
    
    return null;
  };

  // Filter posts based on user preferences
  const filteredPosts = posts.filter(post => {
    // If user has premium and wants to hide sponsored posts, filter them out
    if (isPremium && hideSponsoredPosts && post.sponsored) {
      return false;
    }
    // If user wants to hide game posts, filter them out
    if (hideGamePosts && post.gameData) {
      return false;
    }
    return true;
  });

  // Enhanced post sorting with bump expiration
  const sortedPosts = React.useMemo(() => {
    return [...filteredPosts].sort((a, b) => {
      const aActive = isBumpActive(a);
      const bActive = isBumpActive(b);
      
      // Active bumps go first
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      
      // If both bumped, sort by most recent bump
      if (aActive && bActive) {
        return (b.bumpedAt || 0) - (a.bumpedAt || 0);
      }
      
      // For non-bumped posts, maintain chronological order (newest first)
      return b.id - a.id;
    });
  }, [filteredPosts, posts]); // Add posts as dependency to force recalculation

  return (
    <ParticleSystem>
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
        
        <Header 
          onCategoryChange={handleCategoryChange} 
          isCollapsed={headerCollapsed} 
          onProfileClick={() => setShowMyProfileModal(true)}
          onSubcategoriesVisibilityChange={setShowingSubcategories}
        />
        
        <FlatList 
          ref={flatListRef}
          style={styles.content} 
          contentContainerStyle={[
            styles.scrollContent, 
            { 
              paddingTop: headerCollapsed ? insets.top + 16 : (showingSubcategories ? insets.top + 287 : insets.top + 207),
            }
          ]}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00ff88"
              colors={["#00ff88"]}
              progressBackgroundColor="rgba(0, 0, 0, 0.8)"
              progressViewOffset={headerCollapsed ? 60 : 160}
              enabled={scrollY < 30 && !isScrolling}
            />
          }
          data={sortedPosts}
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
              onBump={handleBump}
              onTip={handleTip}
              onShowTipModal={handleShowTipModal}
              onLikeReply={handleLikeReply}
              onTipReply={handleTipReply}
              onBumpReply={handleBumpReply}
              onToggleReplies={toggleReplies}
              onToggleReplySorting={toggleReplySorting}
              onReport={handleReport}
              onShowProfile={handleShowProfile}
              onShowReportModal={handleShowReportModal}
              onJoinGame={handleJoinGame}
              onGameMove={handleGameMove}
            />
          )}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={10}
          removeClippedSubviews={true}
        />

        {/* Floating Action Button */}
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

        <CreatePostModal
          visible={showCreatePost}
          content={newPostContent}
          activeTab={activeTab}
          activeSubtopic={activeSubtopic}
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

        <ProfileModal
          visible={showProfileModal}
          wallet={selectedWallet}
          allPosts={posts}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedWallet('');
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

        <MyProfileModal
          visible={showMyProfileModal}
          allPosts={posts}
          onClose={() => {
            setShowMyProfileModal(false);
          }}
        />
        </View>
      </View>
    </ParticleSystem>
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