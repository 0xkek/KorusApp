import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import SearchBar from '../../components/SearchBar';
import Post from '../../components/Post';
import { useWallet } from '../../context/WalletContext';
import { useTheme } from '../../context/ThemeContext';
import { initialPosts } from '../../data/mockData';
import { Post as PostType } from '../../types';
import { Fonts, FontSizes } from '../../constants/Fonts';
import { resolveSNSDomain, isValidSNSDomain } from '../../utils/sns';

export default function ExploreScreen() {
  const router = useRouter();
  const { colors, isDarkMode, gradients } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [searchHistory, setSearchHistory] = useState<string[]>([
    'mental health tips',
    'career advice',
    'solana development',
    'productivity hacks'
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    posts: PostType[];
    users: { wallet: string; username?: string; postCount: number; avatar?: string; nftAvatar?: any }[];
  }>({ posts: [], users: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'posts' | 'users'>('all');
  const { walletAddress, selectedAvatar, selectedNFTAvatar } = useWallet();
  const currentUserWallet = walletAddress || 'loading...';

  const handleSearch = async (query: string) => {
    if (isLoading || !query.trim()) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchQuery(query);
    setIsLoading(true);
    setHasSearched(true);
    
    // Add to search history
    if (!searchHistory.includes(query.trim())) {
      setSearchHistory(prev => [query.trim(), ...prev.slice(0, 9)]);
    }

    try {
      const lowerQuery = query.toLowerCase();
      let resolvedWalletAddress: string | null = null;
      
      // Check if the query is a .sol domain
      // Try both with and without .sol extension
      if (isValidSNSDomain(lowerQuery)) {
        resolvedWalletAddress = await resolveSNSDomain(lowerQuery);
      } else if (!lowerQuery.includes('.')) {
        // If no dot, try adding .sol
        const domainWithSol = lowerQuery + '.sol';
        if (isValidSNSDomain(domainWithSol)) {
          resolvedWalletAddress = await resolveSNSDomain(domainWithSol);
        }
      }
      
      // Search posts
      const postResults = initialPosts.filter(post => {
        const matchesContent = post.content.toLowerCase().includes(lowerQuery);
        const matchesCategory = post.category?.toLowerCase().includes(lowerQuery);
        const matchesSubcategory = post.subcategory?.toLowerCase().includes(lowerQuery);
        const matchesWallet = post.wallet.toLowerCase().includes(lowerQuery);
        const matchesResolvedWallet = resolvedWalletAddress && post.wallet === resolvedWalletAddress;
        
        const matchesReply = post.replies.some(reply => 
          reply.content.toLowerCase().includes(lowerQuery) ||
          reply.wallet.toLowerCase().includes(lowerQuery) ||
          (resolvedWalletAddress && reply.wallet === resolvedWalletAddress)
        );
        
        return matchesContent || matchesCategory || matchesSubcategory || matchesWallet || matchesResolvedWallet || matchesReply;
      });

      // Search users (extract unique users from posts)
      const userMap = new Map<string, { wallet: string; username?: string; postCount: number; avatar?: string; nftAvatar?: any }>();
      
      // Add users from posts
      initialPosts.forEach(post => {
        const matchesQuery = post.wallet.toLowerCase().includes(lowerQuery) || 
                           post.username?.toLowerCase().includes(lowerQuery) ||
                           (resolvedWalletAddress && post.wallet === resolvedWalletAddress);
                           
        if (matchesQuery) {
          const existing = userMap.get(post.wallet) || { 
            wallet: post.wallet, 
            username: post.username,
            postCount: 0,
            avatar: post.avatar,
            nftAvatar: post.nftAvatar
          };
          existing.postCount++;
          userMap.set(post.wallet, existing);
        }
        
        // Also check reply authors
        post.replies.forEach(reply => {
          const replyMatchesQuery = reply.wallet.toLowerCase().includes(lowerQuery) ||
                                  (resolvedWalletAddress && reply.wallet === resolvedWalletAddress);
                                  
          if (replyMatchesQuery) {
            const existing = userMap.get(reply.wallet) || { 
              wallet: reply.wallet,
              postCount: 0,
              avatar: reply.avatar,
              nftAvatar: reply.nftAvatar
            };
            existing.postCount++;
            userMap.set(reply.wallet, existing);
          }
        });
      });

      const userResults = Array.from(userMap.values()).sort((a, b) => b.postCount - a.postCount);

      setSearchResults({ posts: postResults, users: userResults });
      setIsLoading(false);
    } catch (error) {
      console.error('Search error:', error);
      setIsLoading(false);
    }
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
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }} 
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <BlurView intensity={25} style={styles.backButtonBlur}>
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
            </BlurView>
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
            <>
              <View style={styles.searchInfo}>
                <Text style={styles.searchInfoText}>
                  {searchQuery ? 
                    `${searchResults.posts.length + searchResults.users.length} results for "${searchQuery}"` :
                    'Search posts, users, or categories'
                  }
                </Text>
              </View>

              {/* Result Tabs */}
              {searchQuery && (searchResults.posts.length > 0 || searchResults.users.length > 0) && (
                <View style={styles.tabContainer}>
                  <TouchableOpacity
                    style={[styles.tab, activeTab === 'all' && styles.activeTab]}
                    onPress={() => {
                      setActiveTab('all');
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
                      All ({searchResults.posts.length + searchResults.users.length})
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
                    onPress={() => {
                      setActiveTab('posts');
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
                      Posts ({searchResults.posts.length})
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.tab, activeTab === 'users' && styles.activeTab]}
                    onPress={() => {
                      setActiveTab('users');
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
                      Users ({searchResults.users.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* Results */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : hasSearched ? (
            (searchResults.posts.length > 0 || searchResults.users.length > 0) ? (
              <>
                {/* User Results */}
                {(activeTab === 'all' || activeTab === 'users') && searchResults.users.length > 0 && (
                  <View style={styles.userSection}>
                    {activeTab === 'all' && <Text style={styles.sectionTitle}>Users</Text>}
                    {searchResults.users.slice(0, activeTab === 'all' ? 3 : undefined).map((user) => (
                      <TouchableOpacity
                        key={user.wallet}
                        style={styles.userItem}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.push({
                            pathname: '/profile',
                            params: { wallet: user.wallet }
                          });
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.userAvatar}>
                          <LinearGradient
                            colors={gradients.primary}
                            style={styles.userAvatarGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            {user.nftAvatar ? (
                              <Image 
                                source={{ uri: user.nftAvatar.image || user.nftAvatar.uri }}
                                style={styles.userAvatarImage}
                              />
                            ) : user.avatar ? (
                              <Text style={styles.userAvatarEmoji}>{user.avatar}</Text>
                            ) : (
                              <Text style={styles.userAvatarText}>
                                {user.wallet.slice(0, 2).toUpperCase()}
                              </Text>
                            )}
                          </LinearGradient>
                        </View>
                        <View style={styles.userInfo}>
                          <Text style={styles.userName}>
                            {user.username || `${user.wallet.slice(0, 4)}...${user.wallet.slice(-4)}`}
                          </Text>
                          <Text style={styles.userWallet} numberOfLines={1}>
                            {user.wallet}
                          </Text>
                          <Text style={styles.userStats}>
                            {user.postCount} {user.postCount === 1 ? 'post' : 'posts'}
                          </Text>
                        </View>
                        <Ionicons 
                          name="chevron-forward" 
                          size={20} 
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    ))}
                    {activeTab === 'all' && searchResults.users.length > 3 && (
                      <TouchableOpacity
                        style={styles.showMoreButton}
                        onPress={() => {
                          setActiveTab('users');
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <Text style={styles.showMoreText}>
                          Show all {searchResults.users.length} users
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Post Results */}
                {(activeTab === 'all' || activeTab === 'posts') && searchResults.posts.length > 0 && (
                  <View style={styles.postSection}>
                    {activeTab === 'all' && searchResults.users.length > 0 && (
                      <Text style={styles.sectionTitle}>Posts</Text>
                    )}
                    {searchResults.posts.map(post => (
                      <Post
                  key={post.id}
                  post={post}
                  expandedPosts={expandedPosts}
                  currentUserWallet={currentUserWallet}
                  currentUserAvatar={selectedAvatar}
                  currentUserNFTAvatar={selectedNFTAvatar}
                  replySortType="best"
                  onLike={(postId) => {
                    setSearchResults(results => ({
                      ...results,
                      posts: results.posts.map(p =>
                        p.id === postId
                          ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
                          : p
                      )
                    }));
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
                  onTip={(postId, amount) => {
                    setSearchResults(results => ({
                      ...results,
                      posts: results.posts.map(p =>
                        p.id === postId ? { ...p, tips: p.tips + amount } : p
                      )
                    }));
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
                  onShowProfile={(wallet) => {
                    router.push({
                      pathname: '/profile',
                      params: { wallet }
                    });
                  }}
                  onShowReportModal={() => {}}
                />
                    ))}
                  </View>
                )}
              </>
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

const createStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
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
    width: 40,
    height: 40,
    borderRadius: 20,
    marginTop: 8,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  backButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  backButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: FontSizes['4xl'],
    fontFamily: Fonts.bold,
    color: colors.primary,
    marginBottom: 8,
    textShadowColor: colors.primary + '66',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  subtitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
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
    color: colors.primary,
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
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  noResultsText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: colors.surface + '40',
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: colors.primary + '20',
  },
  tabText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
    fontFamily: Fonts.semiBold,
  },
  userSection: {
    marginBottom: 24,
  },
  postSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
    color: colors.text,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface + '60',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userAvatarGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  userAvatarEmoji: {
    fontSize: 20,
  },
  userAvatarText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
    color: isDarkMode ? '#000' : '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: colors.text,
    marginBottom: 2,
  },
  userWallet: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.mono,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  userStats: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: colors.textTertiary,
  },
  showMoreButton: {
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: colors.primary,
  },
});