// Create this file: app/subcategory-feed.tsx
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import { initialPosts } from '../data/mockData';
import { Post as PostType, Reply } from '../types';
import { generateWalletAddress } from '../utils/wallet';
import CreatePostModal from '../components/CreatePostModal';
import Post from '../components/Post';

const { width } = Dimensions.get('window');

// Reply sorting types to match your existing app
type ReplySortType = 'best' | 'recent';

export default function SubcategoryFeedScreen() {
  const { category, subcategory } = useLocalSearchParams();
  const router = useRouter();
  
  const [posts, setPosts] = useState<PostType[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());
  const [replySortPreferences, setReplySortPreferences] = useState<Record<number, ReplySortType>>({});
  const [newPostContent, setNewPostContent] = useState('');
  
  // Current user wallet (should match your home screen)
  const [currentUserWallet] = useState(generateWalletAddress());

  // Load posts for this specific subcategory
  useEffect(() => {
    loadSubcategoryPosts();
  }, [category, subcategory]);

  const loadSubcategoryPosts = async () => {
    setIsLoading(true);
    try {
      // Use your actual mockData
      const filteredPosts = initialPosts.filter(
        (post: PostType) => 
          post.category === category && post.subcategory === subcategory
      );
      setPosts(filteredPosts);
    } catch (error) {
      console.error('Error loading subcategory posts:', error);
    } finally {
      setIsLoading(false);
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
  const handleCreatePost = () => {
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
        category: category as string,
        subcategory: subcategory as string,
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

  const handleTip = (postId: number) => {
    setPosts(posts.map(post =>
      post.id === postId
        ? { ...post, tips: post.tips + 1 }
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
    return [...posts].sort((a, b) => {
      const aActive = isBumpActive(a);
      const bActive = isBumpActive(b);
      
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      
      if (aActive && bActive) {
        return (b.bumpedAt || 0) - (a.bumpedAt || 0);
      }
      
      return b.id - a.id;
    });
  }, [posts]);

  // Swipe to go back gesture handler
  const handleSwipeGesture = (event: any) => {
    const { translationX, velocityX } = event.nativeEvent;
    
    // Swipe right with sufficient distance or velocity
    if (translationX > 100 || velocityX > 500) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.back();
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <PanGestureHandler onGestureEvent={handleSwipeGesture}>
        <View style={styles.container}>
      {/* Background Gradients - match your home screen style */}
      <LinearGradient
        colors={[
          'rgba(30, 30, 30, 0.95)',
          'rgba(20, 20, 20, 0.98)',
          'rgba(15, 15, 15, 0.99)',
          'rgba(10, 10, 10, 1)',
        ]}
        style={styles.baseBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <LinearGradient
        colors={[
          'rgba(67, 233, 123, 0.08)',
          'rgba(56, 249, 215, 0.05)',
          'transparent',
          'rgba(67, 233, 123, 0.06)',
          'rgba(56, 249, 215, 0.1)',
        ]}
        style={styles.greenOverlay}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <View style={styles.contentContainer}>
        {/* Custom Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.categoryText}>{category}</Text>
            <Text style={styles.subcategoryText}>{subcategory}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.composeButton}
            onPress={() => setShowCreatePost(true)}
          >
            <Text style={styles.composeButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Posts Content */}
        <ScrollView 
          style={styles.postsContainer}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading {subcategory} posts...</Text>
            </View>
          ) : sortedPosts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No {subcategory} posts yet</Text>
              <Text style={styles.emptySubtitle}>
                Be the first to share something in {subcategory}!
              </Text>
              <TouchableOpacity 
                style={styles.createFirstPostButton}
                onPress={() => setShowCreatePost(true)}
              >
                <Text style={styles.createFirstPostText}>Create First Post</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sortedPosts.map((post) => (
              <Post 
                key={post.id} 
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
                onLikeReply={handleLikeReply}
                onTipReply={handleTipReply}
                onBumpReply={handleBumpReply}
                onToggleReplies={toggleReplies}
                onToggleReplySorting={toggleReplySorting}
              />
            ))
          )}
        </ScrollView>
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
      </PanGestureHandler>
    </GestureHandlerRootView>
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