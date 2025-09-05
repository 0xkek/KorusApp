import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { 
  RefreshControl, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View 
} from 'react-native';
import { useKorusAlert } from '../components/KorusAlertProvider';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import { Post as PostType } from '../types';
import Post from '../components/Post';
import SearchBar from '../components/SearchBar';
import { Fonts, FontSizes } from '../constants/Fonts';
import { searchAPI } from '../utils/api';
import { logger } from '../utils/logger';

export default function SearchScreen() {
  logger.log('[SEARCH SCREEN] Component rendering');
  
  // Test function to verify component is working
  React.useEffect(() => {
    logger.log('[SEARCH SCREEN] Component mounted');
  }, []);
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showAlert } = useKorusAlert();
  const { walletAddress } = useWallet();
  const { isDarkMode, colors } = useTheme();
  const currentUserWallet = walletAddress || 'loading...';

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PostType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  // Use AbortController to cancel previous searches
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Load search history from storage (mock for now)
  useEffect(() => {
    // In real app, load from AsyncStorage
    setSearchHistory(['career tips', 'mental health', 'solana', 'productivity']);
    
    // Cleanup function to cancel any pending search on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Handle URL parameters from navigation
  useEffect(() => {
    if (params.query) {
      const query = Array.isArray(params.query) ? params.query[0] : params.query;
      setSearchQuery(query);
      performSearch(query);
    }
    if (params.category) {
      const category = Array.isArray(params.category) ? params.category[0] : params.category;
      setSelectedCategory(category.toLowerCase());
      performSearch(searchQuery);
    }
  }, [params]);

  // Search function - Simple Twitter-like search
  const performSearch = React.useCallback(async (query: string) => {
    logger.log('[SEARCH] performSearch called with query:', query);
    
    // Cancel any previous search request
    if (abortControllerRef.current) {
      logger.log('[SEARCH] Cancelling previous search request');
      abortControllerRef.current.abort();
    }
    
    // Create new AbortController for this search
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setSearchQuery(query);
    setIsLoading(true);
    setHasSearched(true);
    
    // Add to search history
    if (query.trim() && !searchHistory.includes(query.trim())) {
      setSearchHistory(prev => [query.trim(), ...prev.slice(0, 9)]);
    }

    try {
      // Use the backend search API
      logger.log('[SEARCH] Calling API with query:', query.trim());
      logger.log('[SEARCH] About to call searchAPI.search with:', query.trim());
      
      const response = await searchAPI.search(query.trim() || '', 20, 0, abortController.signal);
      
      // Check if request was aborted
      if (abortController.signal.aborted) {
        logger.log('[SEARCH] Request was aborted, ignoring response');
        return;
      }
      
      logger.log('[SEARCH] Full API response:', response);
      logger.log('[SEARCH] API response:', response);
      logger.log('[SEARCH] Response posts:', response.posts?.length);
      logger.log('[SEARCH] Response success:', response.success);

      if (response && response.posts) {
        logger.log('[SEARCH] Processing', response.posts.length, 'posts');
        let results = response.posts;

        // Transform backend posts to app format
        const transformedResults = results.map((post: any) => ({
          id: post.id,
          wallet: post.authorWallet || post.author?.walletAddress || 'Unknown',
          time: new Date(post.createdAt).toLocaleDateString(),
          timestamp: post.createdAt,
          content: post.content,
          likes: post.likeCount || 0,
          replies: post.replies?.map((reply: any) => ({
            id: reply.id,
            wallet: reply.authorWallet || reply.author?.walletAddress || 'Unknown',
            time: new Date(reply.createdAt).toLocaleDateString(),
            timestamp: reply.createdAt,
            content: reply.content,
            likes: reply.likeCount || 0,
            liked: false,
            tips: reply.tipCount || 0,
            replies: [],
            postId: post.id,
            parentId: reply.parentReplyId,
            isPremium: reply.author?.tier === 'premium',
            userTheme: undefined
          })) || [],
          tips: post.tipCount || 0,
          liked: post.liked || false,
          category: post.topic || 'general',
          imageUrl: post.imageUrl,
          videoUrl: post.videoUrl,
          isPremium: post.author?.tier === 'premium',
          userTheme: undefined,
          gameData: undefined,
          // Include SNS domain from backend
          authorSnsDomain: post.author?.snsDomain
        }));

        // Filter by category if selected
        if (selectedCategory) {
          results = transformedResults.filter((post: PostType) => 
            post.category.toLowerCase() === selectedCategory.toLowerCase()
          );
        } else {
          results = transformedResults;
        }

        // Sort by relevance (mock scoring)
        results.sort((a, b) => {
          const aScore = calculateRelevanceScore(a, query);
          const bScore = calculateRelevanceScore(b, query);
          return bScore - aScore;
        });

        logger.log('[SEARCH] Results count:', results.length);
        setSearchResults(results);
      } else {
        logger.error('[SEARCH] Search failed:', response);
        setSearchResults([]);
      }
    } catch (error: any) {
      // Don't log abort errors
      if (error.name !== 'AbortError') {
        logger.error('Search error:', error);
        logger.error('Error details:', error.response?.data || error.message);
        logger.error('Error status:', error.response?.status);
        logger.error('Error headers:', error.response?.headers);
        logger.error('[SEARCH] Error occurred:', error);
        setSearchResults([]);
      }
    } finally {
      // Only reset loading state if this is the current search
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [searchHistory, selectedCategory]);

  // Calculate relevance score for sorting
  const calculateRelevanceScore = (post: PostType, query: string): number => {
    if (!query.trim()) return post.likes + post.tips; // Default sorting

    const lowerQuery = query.toLowerCase();
    let score = 0;

    // Content matches score highest
    if (post.content.toLowerCase().includes(lowerQuery)) {
      score += 10;
    }

    // Wallet address matches (user search)
    if (post.wallet.toLowerCase().includes(lowerQuery)) {
      score += 8;
    }

    // Category matches
    if (post.category.toLowerCase().includes(lowerQuery)) {
      score += 5;
    }


    // Reply matches
    post.replies.forEach(reply => {
      if (reply.content.toLowerCase().includes(lowerQuery)) {
        score += 2;
      }
      if (reply.wallet.toLowerCase().includes(lowerQuery)) {
        score += 2;
      }
    });

    // Boost by engagement
    score += (post.likes * 0.5) + (post.tips * 1) + (post.replies.length * 0.3);

    return score;
  };

  const handleCategoryFilter = async (category: string | null) => {
    setSelectedCategory(category);
    if (searchQuery.trim()) {
      await performSearch(searchQuery);
    }
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    showAlert({
      title: 'Cleared',
      message: 'Search history cleared',
      type: 'success'
    });
  };

  // Post interaction handlers (similar to home screen)
  const handleLike = (postId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchResults(results => results.map(post =>
      post.id === postId
        ? {
            ...post,
            liked: !post.liked,
            likes: post.liked ? post.likes - 1 : post.likes + 1
          }
        : post
    ));
  };

  const handleTip = (postId: number, amount: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSearchResults(results => results.map(post =>
      post.id === postId
        ? { ...post, tips: post.tips + amount }
        : post
    ));
  };


  const handleReply = (postId: number) => {
    // For now, just expand the post replies
    toggleReplies(postId);
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

  const onRefresh = async () => {
    await performSearch(searchQuery);
  };

  logger.log('[SEARCH SCREEN] About to render, hasSearched:', hasSearched, 'searchResults:', searchResults.length);
  
  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={isDarkMode ? [
          'rgba(30, 30, 30, 0.95)',
          'rgba(20, 20, 20, 0.98)',
          'rgba(15, 15, 15, 0.99)',
          'rgba(10, 10, 10, 1)',
        ] : [
          'rgba(248, 250, 249, 0.95)',
          'rgba(242, 246, 243, 0.98)',
          'rgba(235, 242, 237, 0.99)',
          'rgba(225, 235, 228, 1)',
        ]}
        style={styles.background}
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
      />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Search</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Search Bar */}
        <SearchBar
          onSearch={performSearch}
          onCategoryFilter={handleCategoryFilter}
          searchHistory={searchHistory}
          onClearHistory={clearSearchHistory}
        />

        {/* Search Results */}
        <ScrollView
          style={styles.resultsContainer}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)'}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Search Info */}
          <View style={styles.searchInfo}>
            <Text style={styles.searchInfoText}>
              {searchQuery ? 
                `${searchResults.length} results for "${searchQuery}"` :
                'Search posts, users, or categories'
              }
            </Text>
            {selectedCategory && (
              <Text style={styles.filterInfo}>
                Filtered by: {selectedCategory}
              </Text>
            )}
            {!searchQuery && (
              <Text style={styles.searchHint}>
                💡 Try searching by wallet address, content, or category
              </Text>
            )}
          </View>

          {/* Results */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : hasSearched ? (
            searchResults.length > 0 ? (
              searchResults.map(post => (
                <Post
                  key={post.id}
                  post={post}
                  expandedPosts={expandedPosts}
                  currentUserWallet={currentUserWallet}
                  replySortType="best"
                  onLike={handleLike}
                  onReply={handleReply}
                  onTip={handleTip}
                  onShowTipModal={() => {}} // Handle tip modal
                  onLikeReply={() => {}} // Handle reply interactions
                  onTipReply={() => {}}
                  onToggleReplies={toggleReplies}
                  onToggleReplySorting={() => {}}
                />
              ))
            ) : (
              <View style={styles.noResults}>
                <Text style={styles.noResultsTitle}>No results found</Text>
                <Text style={styles.noResultsText}>
                  Try adjusting your search terms or browse by category
                </Text>
              </View>
            )
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Start typing to search posts and users</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
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
  },
  content: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(67, 233, 123, 0.3)',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
    color: '#43e97b',
  },
  title: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: '#ffffff',
  },
  headerSpacer: {
    width: 60,
  },
  resultsContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Extra padding for tab bar
  },
  searchInfo: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchInfoText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  filterInfo: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
    color: '#43e97b',
    marginTop: 4,
  },
  searchHint: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
    color: '#43e97b',
  },
  noResults: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  noResultsTitle: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  noResultsText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
});