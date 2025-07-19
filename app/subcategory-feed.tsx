// Create this file: app/subcategory-feed.tsx
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Dimensions,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { initialPosts } from '../data/mockData';
import { Post as PostType, Reply } from '../types';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import { useKorusAlert } from '../components/KorusAlertProvider';
import CreatePostModal from '../components/CreatePostModal';
import Post from '../components/Post';
import * as SecureStore from 'expo-secure-store';
import { logger } from '../utils/logger';

const { width } = Dimensions.get('window');

// Reply sorting types to match your existing app
type ReplySortType = 'best' | 'recent';

const HIDE_SPONSORED_KEY = 'korus_hide_sponsored_posts';
const HIDE_GAME_POSTS_KEY = 'korus_hide_game_posts';

export default function SubcategoryFeedScreen() {
  const { category, subcategory } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDarkMode, gradients } = useTheme();
  const { showAlert } = useKorusAlert();
  
  const [posts, setPosts] = useState<PostType[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());
  const [replySortPreferences, setReplySortPreferences] = useState<Record<number, ReplySortType>>({});
  const [newPostContent, setNewPostContent] = useState('');
  const [updateCounter, setUpdateCounter] = useState(0);
  const [hideSponsoredPosts, setHideSponsoredPosts] = useState(false);
  const [hideGamePosts, setHideGamePosts] = useState(false);
  
  // Current user wallet from context
  const { walletAddress, isPremium } = useWallet();
  const currentUserWallet = walletAddress || 'loading...';

  // Load posts for this specific subcategory
  useEffect(() => {
    loadSubcategoryPosts();
    loadPreferences();
  }, [category, subcategory]);

  const loadSubcategoryPosts = async () => {
    setIsLoading(true);
    try {
      // Use your actual mockData
      const filteredPosts = initialPosts.filter(
        (post: PostType) => 
          post.category?.toLowerCase() === category?.toString().toLowerCase() && 
          post.subcategory?.toLowerCase() === subcategory?.toString().toLowerCase()
      );
      setPosts(filteredPosts);
    } catch (error) {
      console.error('Error loading subcategory posts:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadPreferences = async () => {
    try {
      const savedHideSponsored = await SecureStore.getItemAsync(HIDE_SPONSORED_KEY);
      if (savedHideSponsored === 'true') {
        setHideSponsoredPosts(true);
      }
      
      const savedHideGamePosts = await SecureStore.getItemAsync(HIDE_GAME_POSTS_KEY);
      if (savedHideGamePosts === 'true') {
        setHideGamePosts(true);
      }
    } catch (error) {
      logger.error('Error loading preferences:', error);
    }
  };

  // Reply sorting functions (copied from your home screen)
  const calculateConfidenceScore = (likes: number, tips: number, replyCount: number): number => {
    const totalVotes = likes + 1;
    const upvotes = likes;
    const n = totalVotes;
    const p = upvotes / n;
    
    const z = 1.96;
    const left = p + z * z / (2 * n);
    const right = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n);
    const under = 1 + z * z / n;
    
    const score = (left - right) / under;
    const engagementBoost = (tips * 0.5) + (replyCount * 0.3);
    
    return Math.max(0, score + engagementBoost);
  };

  const sortReplies = (replies: Reply[], sortType: ReplySortType): Reply[] => {
    if (sortType === 'recent') {
      return [...replies].sort((a, b) => b.id - a.id);
    }
    
    return [...replies].sort((a, b) => {
      const scoreA = calculateConfidenceScore(a.likes, a.tips, a.replies.length);
      const scoreB = calculateConfidenceScore(b.likes, b.tips, b.replies.length);
      
      if (scoreB === scoreA) {
        return b.id - a.id;
      }
      
      return scoreB - scoreA;
    });
  };

  const getReplySortType = (postId: number): ReplySortType => {
    return replySortPreferences[postId] || 'best';
  };

  const toggleReplySorting = (postId: number) => {
    setReplySortPreferences(prev => ({
      ...prev,
      [postId]: prev[postId] === 'best' ? 'recent' : 'best'
    }));
  };

  // Handler functions to match your existing Post component props
  const handleCreatePost = (categoryParam: string, subcategoryParam: string, imageUrl?: string) => {
    if (newPostContent.trim()) {
      const newPost: PostType = {
        id: Date.now(),
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
        category: categoryParam.toUpperCase(),
        subcategory: subcategoryParam,
        imageUrl: imageUrl,
        isPremium: isPremium,
        userTheme: colors.primary,
      };
      setPosts([newPost, ...posts]);
      setNewPostContent('');
      setShowCreatePost(false);
    }
  };

  const handleLike = (postId: number) => {
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

  const handleShowTipModal = (postId: number) => {
    // For subcategory feed, use simple tip for now
    handleTip(postId, 1);
  };

  const handleTip = (postId: number, amount: number = 1) => {
    setPosts(posts.map(post =>
      post.id === postId
        ? { ...post, tips: post.tips + amount }
        : post
    ));
  };

  const handleBump = (postId: number) => {
    const now = Date.now();
    setPosts(posts.map(post =>
      post.id === postId
        ? { 
            ...post, 
            bumped: true, 
            bumpedAt: now,
            bumpExpiresAt: now + (5 * 60 * 1000) // 5 minutes
          }
        : post
    ));
  };

  const handleReply = (postId: number, quotedReplyText?: string, quotedReplyUsername?: string) => {
    // For now, just expand the post - you can implement full reply functionality later
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (!newSet.has(postId)) {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleLikeReply = (postId: number, replyId: number) => {
    // Implement reply liking logic similar to your home screen
  };

  const handleTipReply = (postId: number, replyId: number) => {
    // Implement reply tipping logic similar to your home screen
  };

  const handleBumpReply = (replyId: number) => {
    // Empty function to match your home screen
  };

  const handleJoinGame = (postId: number) => {
    setPosts(prevPosts => {
      const newPosts = prevPosts.map(p => {
        if (p.id === postId && p.gameData) {
          const updatedGameData = {
            ...p.gameData,
            player2: currentUserWallet,
            status: 'active' as const,
            currentPlayer: p.gameData.player1
          };
          
          // Initialize game-specific data
          if (p.gameData.type === 'rps') {
            updatedGameData.rounds = [];
            updatedGameData.currentRound = 1;
          } else if (p.gameData.type === 'coinflip') {
            // For coin flip, player1 automatically gets the opposite of what player2 will choose
            updatedGameData.player1Choice = null;
            updatedGameData.player2Choice = null;
            updatedGameData.result = null;
          }
          
          return {
            ...p,
            gameData: updatedGameData
          };
        }
        return p;
      });
      return newPosts;
    });
    
    showAlert({
      title: 'Game Joined!',
      message: 'You have successfully joined the game. Good luck!',
      type: 'success'
    });
    
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
            const isPlayer1 = currentUserWallet === p.gameData.player1;
            const currentRound = p.gameData.currentRound || 1;
            const rounds = p.gameData.rounds || [];
            
            if (!rounds[currentRound - 1]) {
              rounds[currentRound - 1] = {};
            }
            
            if (isPlayer1) {
              rounds[currentRound - 1].player1Choice = moveData;
            } else {
              rounds[currentRound - 1].player2Choice = moveData;
            }
            
            if (rounds[currentRound - 1].player1Choice && rounds[currentRound - 1].player2Choice) {
              const p1Choice = rounds[currentRound - 1].player1Choice;
              const p2Choice = rounds[currentRound - 1].player2Choice;
              
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
              
              const p1Wins = rounds.filter(r => r.winner === p.gameData.player1).length;
              const p2Wins = rounds.filter(r => r.winner === p.gameData.player2).length;
              
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
            const isPlayer2 = currentUserWallet === p.gameData.player2;
            
            if (isPlayer2 && !p.gameData.player2Choice) {
              const player1Choice = moveData === 'heads' ? 'tails' : 'heads';
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
          const board = p.gameData.board.map(boardRow => [...boardRow]);
          const currentSymbol = p.gameData.currentPlayer === p.gameData.player1 ? 'X' : 'O';
          
          board[row][col] = currentSymbol;
          
          const winner = checkTicTacToeWinner(board);
          
          const nextPlayer = p.gameData.currentPlayer === p.gameData.player1 ? p.gameData.player2 : p.gameData.player1;
          
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

  // Check if bump is still active
  const isBumpActive = (post: PostType): boolean => {
    if (!post.bumped || !post.bumpedAt || !post.bumpExpiresAt) return false;
    return Date.now() < post.bumpExpiresAt;
  };

  const sortedPosts = useMemo(() => {
    // Filter posts based on user preferences
    const filtered = posts.filter(post => {
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
    
    return [...filtered].sort((a, b) => {
      const aActive = isBumpActive(a);
      const bActive = isBumpActive(b);
      
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      
      if (aActive && bActive) {
        return (b.bumpedAt || 0) - (a.bumpedAt || 0);
      }
      
      return b.id - a.id;
    });
  }, [posts, updateCounter, hideSponsoredPosts, hideGamePosts, isPremium]);


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background Gradients - match your home screen style */}
      <LinearGradient
        colors={gradients.surface}
        style={styles.baseBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
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
        {/* Custom Header */}
        <View style={[styles.header, { borderBottomColor: colors.primary }]}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.backButtonText, { color: isDarkMode ? '#000' : '#fff' }]}>Back</Text>
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={[styles.categoryText, { color: colors.text }]}>{category}</Text>
            <Text style={[styles.subcategoryText, { color: colors.primary }]}>{subcategory}</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.composeButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowCreatePost(true)}
          >
            <Text style={[styles.composeButtonText, { color: isDarkMode ? '#000' : '#fff' }]}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Posts Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.text }]}>Loading {subcategory} posts...</Text>
          </View>
        ) : sortedPosts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No {subcategory} posts yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Be the first to share something in {subcategory}!
            </Text>
            <TouchableOpacity 
              style={[styles.createFirstPostButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowCreatePost(true)}
            >
              <Text style={[styles.createFirstPostText, { color: isDarkMode ? '#000' : '#fff' }]}>Create First Post</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={sortedPosts}
            extraData={[posts, expandedPosts, updateCounter]}
            keyExtractor={(item) => {
              // For game posts, include game state in the key to force re-render
              if (item.gameData) {
                if (item.gameData.type === 'tictactoe' && item.gameData.board) {
                  const boardState = item.gameData.board.flat().map(cell => cell || '_').join('');
                  return `${item.id}-${boardState}`;
                }
                if (item.gameData.type === 'rps') {
                  const roundsState = JSON.stringify(item.gameData.rounds || []);
                  return `${item.id}-rps-${item.gameData.status}-${item.gameData.player2 || 'none'}-${roundsState}`;
                }
                if (item.gameData.type === 'coinflip') {
                  return `${item.id}-coin-${item.gameData.status}-${item.gameData.player2 || 'none'}-${item.gameData.player2Choice || 'none'}`;
                }
                return `${item.id}-${item.gameData?.status || 'post'}-${item.gameData?.player2 || 'none'}`;
              }
              return item.id.toString();
            }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            renderItem={({ item: post }) => (
              <Post 
                post={{
                  ...post,
                  replies: sortReplies(post.replies, getReplySortType(post.id))
                }}
                expandedPosts={expandedPosts}
                currentUserWallet={currentUserWallet}
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
                onJoinGame={handleJoinGame}
                onGameMove={handleGameMove}
              />
            )}
          />
        )}
      </View>

      {/* Create Post Modal - match your existing modal props */}
      {showCreatePost && (
        <CreatePostModal
          visible={showCreatePost}
          content={newPostContent}
          activeTab={category as string}
          activeSubtopic={subcategory as string}
          onClose={() => setShowCreatePost(false)}
          onContentChange={setNewPostContent}
          onSubmit={handleCreatePost}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  baseBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
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
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#00ff88',
  },
  backButton: {
    width: 60,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00ff88',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  categoryText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    opacity: 1,
  },
  subcategoryText: {
    color: '#00ff88',
    fontSize: 18,
    fontWeight: 'bold',
  },
  composeButton: {
    width: 60,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00ff88',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeButtonText: {
    color: '#000000',
    fontSize: 24,
    fontWeight: 'bold',
  },
  postsContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    opacity: 0.7,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtitle: {
    color: '#ffffff',
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  createFirstPostButton: {
    backgroundColor: '#00ff88',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  createFirstPostText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});