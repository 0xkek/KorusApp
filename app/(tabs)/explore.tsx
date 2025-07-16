import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SearchBar from '../../components/SearchBar';
import Post from '../../components/Post';
import { useWallet } from '../../context/WalletContext';
import { useTheme } from '../../context/ThemeContext';
import { initialPosts } from '../../data/mockData';
import { Post as PostType } from '../../types';
import { Fonts, FontSizes } from '../../constants/Fonts';

export default function ExploreScreen() {
  const router = useRouter();
  const { colors, isDarkMode, gradients } = useTheme();
  const [searchHistory, setSearchHistory] = useState<string[]>([
    'mental health tips',
    'career advice',
    'solana development',
    'productivity hacks'
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PostType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());
  const { walletAddress } = useWallet();
  const currentUserWallet = walletAddress || 'loading...';

  const handleSearch = (query: string) => {
    if (isLoading || !query.trim()) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchQuery(query);
    setIsLoading(true);
    setHasSearched(true);
    
    // Add to search history
    if (!searchHistory.includes(query.trim())) {
      setSearchHistory(prev => [query.trim(), ...prev.slice(0, 9)]);
    }

    // Simulate search
    setTimeout(() => {
      let results = initialPosts;
      const lowerQuery = query.toLowerCase();
      
      results = results.filter(post => 
        post.content.toLowerCase().includes(lowerQuery) ||
        post.category.toLowerCase().includes(lowerQuery) ||
        post.subcategory.toLowerCase().includes(lowerQuery) ||
        post.wallet.toLowerCase().includes(lowerQuery) ||
        post.replies.some(reply => 
          reply.content.toLowerCase().includes(lowerQuery) ||
          reply.wallet.toLowerCase().includes(lowerQuery)
        )
      );

      setSearchResults(results);
      setIsLoading(false);
    }, 300);
  };

  const handleCategoryFilter = (category: string | null) => {
    // Remove category filtering for now
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background - Match homepage */}
      <LinearGradient
        colors={gradients.surface}
        style={styles.background}
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

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Search</Text>
            <Text style={styles.subtitle}>Find posts, topics, and users</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Search Bar */}
        <SearchBar
          onSearch={handleSearch}
          placeholder="Search posts, topics, or wallet addresses..."
          searchHistory={searchHistory}
          onClearHistory={() => setSearchHistory([])}
          showCategoryFilter={false}
        />

        {/* Search Results */}
        <ScrollView
          style={styles.resultsContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Search Info */}
          {hasSearched && (
            <View style={styles.searchInfo}>
              <Text style={styles.searchInfoText}>
                {searchQuery ? 
                  `${searchResults.length} results for "${searchQuery}"` :
                  'Search posts, users, or categories'
                }
              </Text>
            </View>
          )}

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
                  onLike={(postId) => {
                    setSearchResults(results => results.map(p =>
                      p.id === postId
                        ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
                        : p
                    ));
                  }}
                  onReply={(postId) => {
                    setExpandedPosts(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(postId)) {
                        newSet.delete(postId);
                      } else {
                        newSet.add(postId);
                      }
                      return newSet;
                    });
                  }}
                  onBump={(postId) => {
                    const now = Date.now();
                    setSearchResults(results => results.map(p =>
                      p.id === postId
                        ? { ...p, bumped: true, bumpedAt: now, bumpExpiresAt: now + (5 * 60 * 1000) }
                        : p
                    ));
                  }}
                  onTip={(postId, amount) => {
                    setSearchResults(results => results.map(p =>
                      p.id === postId ? { ...p, tips: p.tips + amount } : p
                    ));
                  }}
                  onShowTipModal={() => {}}
                  onLikeReply={() => {}}
                  onTipReply={() => {}}
                  onBumpReply={() => {}}
                  onToggleReplies={(postId) => {
                    setExpandedPosts(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(postId)) {
                        newSet.delete(postId);
                      } else {
                        newSet.add(postId);
                      }
                      return newSet;
                    });
                  }}
                  onToggleReplySorting={() => {}}
                  onReport={() => {}}
                  onShowProfile={() => {}}
                />
              ))
            ) : (
              <View style={styles.noResults}>
                <Text style={styles.noResultsTitle}>No results found</Text>
                <Text style={styles.noResultsText}>
                  Try adjusting your search terms or search by wallet address
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    width: 60,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#43e97b',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  backButtonText: {
    color: '#000000',
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: FontSizes['4xl'],
    fontFamily: Fonts.bold,
    color: '#43e97b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60,
  },
  resultsContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  searchInfo: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  searchInfoText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: 'rgba(255, 255, 255, 0.9)',
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
    color: 'rgba(255, 255, 255, 0.8)',
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
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
});