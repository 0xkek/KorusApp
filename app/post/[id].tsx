import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import { Post as PostType, Reply as ReplyType } from '../../types';
import { postsAPI } from '../../utils/api';
import { logger } from '../../utils/logger';

import Post from '../../components/Post';
import Reply from '../../components/Reply';
import ReplyModal from '../../components/ReplyModal';
import { useKorusAlert } from '../../components/KorusAlertProvider';
import ParticleSystem from '../../components/ParticleSystem';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDarkMode, gradients } = useTheme();
  const { walletAddress, isPremium } = useWallet();
  const { showAlert } = useKorusAlert();
  const insets = useSafeAreaInsets();
  
  const [post, setPost] = useState<PostType | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [newReplyContent, setNewReplyContent] = useState('');
  const [quotedText, setQuotedText] = useState<string>('');
  const [quotedUsername, setQuotedUsername] = useState<string>('');
  const [selectedReplyId, setSelectedReplyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  const currentUserWallet = walletAddress || 'loading...';
  
  // Organize replies into threads
  const organizeRepliesIntoThreads = (replies: ReplyType[]) => {
    const threads: ReplyType[][] = [];
    
    // First pass: organize direct replies to the post
    replies.forEach(reply => {
      if (!reply.parentId || reply.parentId === post?.id) {
        // This is a direct reply to the post
        threads.push([reply]);
        if (reply.replies && reply.replies.length > 0) {
          // Add its replies to the same thread
          threads[threads.length - 1].push(...flattenReplies(reply.replies));
        }
      }
    });
    
    return threads;
  };
  
  const flattenReplies = (replies: ReplyType[]): ReplyType[] => {
    const flat: ReplyType[] = [];
    replies.forEach(reply => {
      flat.push(reply);
      if (reply.replies && reply.replies.length > 0) {
        flat.push(...flattenReplies(reply.replies));
      }
    });
    return flat;
  };
  
  useEffect(() => {
    // Load the post from API
    const loadPost = async () => {
      try {
        setLoading(true);
        const response = await postsAPI.getPost(String(id));
        
        if (response.success && response.post) {
          // Transform backend post to app format
          const transformedPost: PostType = {
            id: response.post.id,
            wallet: response.post.authorWallet || response.post.author?.walletAddress || 'Unknown',
            time: new Date(response.post.createdAt).toLocaleDateString(),
            content: response.post.content,
            likes: response.post.likeCount || 0,
            replies: response.post.replies?.map((reply: any) => ({
              id: reply.id,
              wallet: reply.author?.walletAddress || 'Unknown',
              time: new Date(reply.createdAt).toLocaleDateString(),
              content: reply.content,
              likes: reply.likeCount || 0,
              liked: false,
              tips: 0,
              replies: [],
              parentId: response.post.id,
              isPremium: reply.author?.walletAddress === walletAddress ? isPremium : reply.author?.tier === 'premium',
              userTheme: undefined
            })) || [],
            tips: response.post.tipCount || 0,
            liked: response.post.liked || false,
            category: response.post.subtopic || 'general',
            imageUrl: response.post.imageUrl,
            videoUrl: response.post.videoUrl,
            isPremium: response.post.author?.tier === 'premium',
            userTheme: undefined,
            gameData: undefined
          };
          
          setPost(transformedPost);
        } else {
          logger.error('Failed to load post');
          showAlert({
            title: 'Error',
            message: 'Failed to load post',
            type: 'error'
          });
          router.back();
        }
      } catch (error) {
        logger.error('Error loading post:', error);
        showAlert({
          title: 'Error',
          message: 'Failed to load post',
          type: 'error'
        });
        router.back();
      } finally {
        setLoading(false);
      }
    };
    
    loadPost();
  }, [id]);
  
  if (loading || !post) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={gradients.surface}
          style={styles.baseBackground}
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading post...</Text>
        </View>
      </View>
    );
  }
  
  const threads = post ? organizeRepliesIntoThreads(post.replies) : [];
  
  const handleReply = (postId: number, quotedReplyText?: string, quotedReplyUsername?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (quotedReplyText && quotedReplyUsername) {
      setQuotedText(quotedReplyText);
      setQuotedUsername(quotedReplyUsername);
    } else {
      setQuotedText('');
      setQuotedUsername('');
    }
    setShowReplyModal(true);
  };
  
  const handleCreateReply = () => {
    if (newReplyContent.trim() && post) {
      let replyContent = newReplyContent;
      
      if (quotedText && quotedUsername) {
        replyContent = `> "${quotedText}"\n\n${newReplyContent}`;
      }
      
      const newReply: ReplyType = {
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
        parentId: selectedReplyId || post.id,
        isPremium: isPremium,
        userTheme: colors.primary
      };
      
      // Update the post with new reply
      if (selectedReplyId) {
        // This is a reply to a reply - need to add it to the parent reply's replies array
        const addReplyToParent = (replies: ReplyType[]): ReplyType[] => {
          return replies.map(reply => {
            if (reply.id === selectedReplyId) {
              return {
                ...reply,
                replies: [...reply.replies, newReply]
              };
            }
            if (reply.replies && reply.replies.length > 0) {
              return {
                ...reply,
                replies: addReplyToParent(reply.replies)
              };
            }
            return reply;
          });
        };
        
        setPost({
          ...post,
          replies: addReplyToParent(post.replies)
        });
      } else {
        // This is a direct reply to the post
        setPost({
          ...post,
          replies: [...post.replies, newReply]
        });
      }
      
      setNewReplyContent('');
      setQuotedText('');
      setQuotedUsername('');
      setShowReplyModal(false);
      setSelectedReplyId(null);
      
      showAlert({
        title: 'Success',
        message: 'Your reply has been posted!',
        type: 'success'
      });
    }
  };
  
  const handleLikeReply = (postId: number, replyId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Update reply likes
    if (post) {
      const updateReplyLikes = (replies: ReplyType[]): ReplyType[] => {
        return replies.map(reply => {
          if (reply.id === replyId) {
            return {
              ...reply,
              liked: !reply.liked,
              likes: reply.liked ? reply.likes - 1 : reply.likes + 1
            };
          }
          if (reply.replies.length > 0) {
            return { ...reply, replies: updateReplyLikes(reply.replies) };
          }
          return reply;
        });
      };
      
      setPost({
        ...post,
        replies: updateReplyLikes(post.replies)
      });
    }
  };
  
  const renderThread = ({ item: thread, index }: { item: ReplyType[], index: number }) => (
    <View style={styles.threadContainer}>
      {thread.map((reply, replyIndex) => (
        <View key={reply.id}>
          {/* Vertical connector between nested replies */}
          {replyIndex > 0 && (
            <View style={styles.nestedReplyConnector}>
              <View style={[styles.nestedReplyLine, { backgroundColor: colors.primary + '80' }]} />
            </View>
          )}
          
          <View style={[
            styles.replyWrapper,
            replyIndex > 0 && styles.nestedReply
          ]}>
            <Reply
              reply={reply}
              postId={post!.id}
              currentUserWallet={currentUserWallet}
              onLike={handleLikeReply}
              onReply={(postId, quotedText, quotedUsername) => {
                setSelectedReplyId(reply.id);
                handleReply(postId, quotedText, quotedUsername);
              }}
              onBump={() => {}}
              onTip={() => {}}
              isDetailView={true}
              parentUsername={replyIndex === 0 ? post!.wallet : thread[replyIndex - 1].wallet}
              post={post}
            />
          </View>
        </View>
      ))}
      {index < threads.length - 1 && (
        <View style={[styles.threadSeparator]}>
          <View style={[styles.threadSeparatorLine, { backgroundColor: colors.primary + 'A0' }]} />
        </View>
      )}
    </View>
  );
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          presentation: 'card',
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal'
        }} 
      />
      <ParticleSystem>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Full screen background gradients */}
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
        
        <View style={styles.contentWrapper}>
          {/* Status bar overlay for better visibility */}
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
          
          {/* Header with back button */}
          <View style={[styles.header, { paddingTop: 50 }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                
                // Close any open modals first
                if (showReplyModal) {
                  setShowReplyModal(false);
                  setQuotedText('');
                  setQuotedUsername('');
                  setSelectedReplyId(null);
                }
                
                // Then navigate back
                router.back();
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={gradients.primary}
                style={styles.backButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons 
                  name="arrow-back" 
                  size={20} 
                  color={isDarkMode ? '#000' : '#fff'} 
                />
              </LinearGradient>
            </TouchableOpacity>
            
            <Text style={[styles.title, { color: colors.text }]}>
              {post?.gameData ? 'Game Arena' : 'Reply Threads'}
            </Text>
            
            {/* Empty view for spacing */}
            <View style={{ width: 40 }} />
          </View>
      
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Original Post */}
            <View style={styles.postContainer}>
              <Post
                post={post}
                expandedPosts={new Set([post.id])} // Always expand games in detail view
                currentUserWallet={currentUserWallet}
                onLike={(postId) => {
                  // Update post likes
                  if (post) {
                    setPost({
                      ...post,
                      liked: !post.liked,
                      likes: post.liked ? post.likes - 1 : post.likes + 1
                    });
                  }
                }}
                onReply={handleReply}
                onBump={(postId) => {
                  // Update post bump status
                  if (post) {
                    setPost({
                      ...post,
                      bumped: true,
                      bumpedAt: Date.now(),
                      bumpExpiresAt: Date.now() + (5 * 60 * 1000)
                    });
                    showAlert({
                      title: 'Bump',
                      message: 'Post bumped for 5 minutes! ⬆️',
                      type: 'bump'
                    });
                  }
                }}
                onTip={(postId, amount) => {
                  // Update post tips
                  if (post) {
                    setPost({
                      ...post,
                      tips: post.tips + amount
                    });
                  }
                }}
                onShowTipModal={() => {}}
                onLikeReply={handleLikeReply}
                onTipReply={() => {}}
                onBumpReply={() => {}}
                onToggleReplies={() => {}}
                onToggleReplySorting={() => {}}
                onReport={() => {}}
                onShowProfile={(wallet) => {
                  router.push({
                    pathname: '/profile',
                    params: { wallet }
                  });
                }}
                onShowReportModal={() => {}}
                onJoinGame={(postId) => {
                  // Handle game join in detail view
                  showAlert({
                    title: 'Game Already Joined',
                    message: 'You are viewing this game.',
                    type: 'info'
                  });
                }}
                onGameMove={(postId, moveData, moveType) => {
                  // Update game state for moves
                  if (post && post.gameData) {
                    // Handle TicTacToe moves
                    if (post.gameData.type === 'tictactoe' && typeof moveData === 'number' && typeof moveType === 'number') {
                      const row = moveData;
                      const col = moveType;
                      const board = [...post.gameData.board];
                      const currentSymbol = post.gameData.currentPlayer?.toLowerCase() === post.gameData.player1?.toLowerCase() ? 'X' : 'O';
                      
                      board[row][col] = currentSymbol;
                      
                      // Check for winner
                      const checkWinner = (board: any[][]) => {
                        // Check rows, columns, and diagonals
                        for (let i = 0; i < 3; i++) {
                          if (board[i][0] && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
                            return board[i][0] === 'X' ? post.gameData!.player1 : post.gameData!.player2;
                          }
                          if (board[0][i] && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
                            return board[0][i] === 'X' ? post.gameData!.player1 : post.gameData!.player2;
                          }
                        }
                        if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
                          return board[0][0] === 'X' ? post.gameData!.player1 : post.gameData!.player2;
                        }
                        if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
                          return board[0][2] === 'X' ? post.gameData!.player1 : post.gameData!.player2;
                        }
                        
                        // Check for draw
                        const isDraw = board.every(row => row.every(cell => cell !== null));
                        if (isDraw) return 'draw';
                        
                        return null;
                      };
                      
                      const winner = checkWinner(board);
                      
                      setPost({
                        ...post,
                        gameData: {
                          ...post.gameData,
                          board,
                          currentPlayer: winner ? post.gameData.currentPlayer : 
                            (post.gameData.currentPlayer?.toLowerCase() === post.gameData.player1?.toLowerCase() 
                              ? post.gameData.player2 
                              : post.gameData.player1),
                          winner,
                          status: winner ? 'completed' : 'active'
                        }
                      });
                    }
                    
                    // Handle other game types similarly...
                  }
                }}
                showAsDetail={true}
              />
            </View>
            
            {/* Thread connector line - only show for non-game posts */}
            {!post?.gameData && threads.length > 0 && (
              <View style={styles.threadConnectorContainer}>
                <View style={[styles.threadConnectorLine, { backgroundColor: colors.primary + '80' }]} />
              </View>
            )}
            
            {/* Replies - only show for non-game posts */}
            {!post?.gameData && threads.length > 0 && (
              <View style={styles.threadsContainer}>
                {threads.map((thread, index) => (
                  <View key={`thread-${index}`}>
                    {renderThread({ item: thread, index })}
                  </View>
                ))}
              </View>
            )}
            
            {!post?.gameData && threads.length === 0 && (
              <View style={styles.noRepliesContainer}>
                <Text style={[styles.noRepliesText, { color: colors.textTertiary }]}>
                  No replies yet. Be the first to reply!
                </Text>
              </View>
            )}
          </ScrollView>
          
          {/* Floating Action Button for Reply */}
          <TouchableOpacity
            style={[styles.fab, { shadowColor: colors.shadowColor }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleReply(post!.id);
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
                name="chatbubble-outline" 
                size={24} 
                color={isDarkMode ? '#000' : '#fff'} 
              />
            </LinearGradient>
          </TouchableOpacity>
      
        </View>
        
        {/* Reply Modal */}
        <ReplyModal
          visible={showReplyModal}
          content={newReplyContent}
          quotedText={quotedText}
          quotedUsername={quotedUsername}
          onClose={() => {
            setShowReplyModal(false);
            setQuotedText('');
            setQuotedUsername('');
            setSelectedReplyId(null);
          }}
          onContentChange={setNewReplyContent}
          onSubmit={handleCreateReply}
        />
      </View>
    </ParticleSystem>
    </>
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
  contentWrapper: {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  backButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  titleUnderline: {
    width: 80,
    height: 3,
    borderRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 5,
    paddingBottom: 120,
  },
  postContainer: {
    marginBottom: 0,
  },
  threadConnectorContainer: {
    alignItems: 'center',
    height: 29,
    marginTop: -8,
    marginBottom: -8,
  },
  threadConnectorLine: {
    width: 3,
    height: 21,
    opacity: 0.8,
    borderRadius: 1.5,
  },
  threadConnectorDot: {
    position: 'absolute',
    bottom: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  threadsContainer: {
    paddingBottom: 16,
  },
  noRepliesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noRepliesText: {
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  threadContainer: {
    marginBottom: 0,
  },
  threadSeparator: {
    height: 40,
    marginHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadSeparatorLine: {
    height: 2,
    width: '100%',
    borderRadius: 1,
  },
  replyWrapper: {
    position: 'relative',
  },
  nestedReply: {
    marginLeft: 0,
  },
  nestedReplyConnector: {
    alignItems: 'center',
    height: 30,
    marginTop: -8,
    marginBottom: -8,
  },
  nestedReplyLine: {
    width: 3,
    height: 21,
    opacity: 0.8,
    borderRadius: 1.5,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
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
});