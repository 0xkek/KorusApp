'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';

interface SearchResult {
  id: number;
  user: string;
  userWallet: string;
  userAvatar?: string;
  content: string;
  likes: number;
  replies: number;
  tips: number;
  time: string;
  timeAgo: string;
  category?: string;
  subcategory?: string;
  imageUrl?: string;
  videoUrl?: string;
  isPremium?: boolean;
  isShoutout?: boolean;
}

interface User {
  wallet: string;
  username?: string;
  avatar?: string;
  isPremium: boolean;
  followers: number;
  reputation: number;
}

export default function SearchPage() {
  const { connected, publicKey } = useWallet();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [userResults, setUserResults] = useState<User[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'users'>('posts');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const categories = ['all', 'general', 'games', 'events', 'technology', 'defi', 'nft'];
  const currentUserWallet = publicKey?.toBase58() || '';

  useEffect(() => {
    // Load search history from localStorage
    const saved = localStorage.getItem('korus-search-history');
    if (saved) {
      setSearchHistory(JSON.parse(saved));
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }

    // Load trending topics (mock data)
    setTrendingTopics(['solana', 'defi', 'nft', 'web3', 'gaming', 'blockchain']);

    // Handle URL search params
    const query = searchParams.get('q');
    const category = searchParams.get('category');

    if (query) {
      setSearchQuery(query);
      performSearch(query, category || 'all');
    }

    // Focus search input on mount
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchParams]);

  const performSearch = useCallback(async (query: string, category: string = 'all') => {
    if (!query.trim()) return;

    // Cancel any previous search request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setHasSearched(true);

    // Add to search history
    if (!searchHistory.includes(query.trim())) {
      const newHistory = [query.trim(), ...searchHistory.slice(0, 9)];
      setSearchHistory(newHistory);
      setRecentSearches(newHistory.slice(0, 5));
      localStorage.setItem('korus-search-history', JSON.stringify(newHistory));
    }

    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay

      if (abortController.signal.aborted) return;

      // Mock search results
      const mockPosts: SearchResult[] = [
        {
          id: 1,
          user: 'cryptodev.sol',
          userWallet: '7xKXtg2CW87d9wz9X9V1kZ2N5v7W3rQ2K1',
          userAvatar: '🚀',
          content: `Found something interesting about "${query}"! This post matches your search perfectly. Let me share some insights about this topic.`,
          likes: 24,
          replies: 6,
          tips: 2,
          time: '2024-01-15T10:30:00Z',
          timeAgo: '2h',
          category: 'Technology',
          isPremium: true,
        },
        {
          id: 2,
          user: 'alice.sol',
          userWallet: '8yLXtg3DW98e9xy0A9W2lZ3O6v8X4sR3L2',
          userAvatar: '🎨',
          content: `Great discussion about ${query}. I've been researching this topic for months and here's what I found...`,
          likes: 18,
          replies: 3,
          tips: 1,
          time: '2024-01-15T09:15:00Z',
          timeAgo: '3h',
          category: 'General',
          imageUrl: 'https://picsum.photos/600/400?random=2',
        },
        {
          id: 3,
          user: 'bob.sol',
          userWallet: '9zMXug4EX09f0yz1B0X3mZ4P7v9Y5tS4M3',
          userAvatar: '⚡',
          content: `My experience with ${query} has been amazing! Here's a quick tutorial on how to get started.`,
          likes: 35,
          replies: 12,
          tips: 5,
          time: '2024-01-15T08:00:00Z',
          timeAgo: '4h',
          category: 'Technology',
          isPremium: true,
        },
      ];

      const mockUsers: User[] = [
        {
          wallet: '7xKXtg2CW87d9wz9X9V1kZ2N5v7W3rQ2K1',
          username: 'cryptodev.sol',
          avatar: '🚀',
          isPremium: true,
          followers: 1250,
          reputation: 8500,
        },
        {
          wallet: '8yLXtg3DW98e9xy0A9W2lZ3O6v8X4sR3L2',
          username: 'alice.sol',
          avatar: '🎨',
          isPremium: false,
          followers: 890,
          reputation: 6200,
        },
      ];

      // Filter by category
      let filteredPosts = mockPosts;
      if (category !== 'all') {
        filteredPosts = mockPosts.filter(post =>
          post.category?.toLowerCase() === category.toLowerCase()
        );
      }

      setSearchResults(filteredPosts);
      setUserResults(mockUsers);
    } catch (error) {
      if (!abortController.signal.aborted) {
        console.error('Search failed:', error);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [searchHistory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      performSearch(searchQuery.trim(), selectedCategory);

      // Update URL
      const params = new URLSearchParams();
      params.set('q', searchQuery.trim());
      if (selectedCategory !== 'all') {
        params.set('category', selectedCategory);
      }
      router.replace(`/search?${params.toString()}`);
    }
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicks
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const selectSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    performSearch(suggestion, selectedCategory);
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    setRecentSearches([]);
    localStorage.removeItem('korus-search-history');
  };

  return (
    <main className="min-h-screen bg-korus-dark-100 relative overflow-hidden">
      {/* Background gradients */}
      <div className="fixed inset-0 bg-gradient-to-br from-korus-dark-100 via-korus-dark-200 to-korus-dark-100">
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-korus-dark-300/25 to-korus-dark-200/35" />
      </div>

      {/* Animated gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-korus-primary/30 to-korus-secondary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-korus-secondary/25 to-korus-primary/15 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-korus-primary/10 to-korus-secondary/10 rounded-full blur-3xl animate-float-delayed" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex min-h-screen">
          {/* Left Sidebar */}
          <div className="hidden lg:block lg:w-80 xl:w-80 fixed left-0 top-0 h-full border-r border-korus-border bg-korus-surface/5 backdrop-blur-sm">
            {/* Left sidebar content would go here */}
          </div>

          {/* Main Content */}
          <div className="flex-1 lg:ml-80 lg:mr-96 md:ml-64 md:mr-80 sm:ml-0 sm:mr-0 md:border-x md:border-korus-border bg-korus-surface/10 backdrop-blur-sm max-w-full overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-korus-surface/80 backdrop-blur-md border-b border-korus-borderLight">
              <div className="px-4 py-4">
                <div className="flex items-center gap-4">
                  <Link href="/" className="p-2 hover:bg-korus-surface/60 rounded-full transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </Link>
                  <h1 className="text-3xl font-bold text-white">Search</h1>
                </div>
              </div>
            </div>

            <div className="px-4 py-6">
          {/* Search Bar */}
          <div className="relative mb-6">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="Search Korus..."
                  className="w-full bg-korus-surface/30 backdrop-blur-sm text-white pl-12 pr-4 py-3 rounded-2xl border border-korus-borderLight focus:outline-none focus:border-korus-primary transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setShowSuggestions(true);
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                )}
              </div>
            </form>

            {/* Search Suggestions */}
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-korus-surface/30 backdrop-blur-sm border border-korus-borderLight rounded-2xl overflow-hidden z-20">
                {recentSearches.length > 0 && (
                  <div className="p-4 border-b border-korus-borderLight">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-white">Recent searches</h3>
                      <button
                        onClick={clearSearchHistory}
                        className="text-korus-primary text-sm hover:underline"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="space-y-2">
                      {recentSearches.map((search, index) => (
                        <button
                          key={index}
                          onClick={() => selectSuggestion(search)}
                          className="flex items-center gap-3 w-full text-left p-2 hover:bg-korus-surface/60 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          <span className="text-gray-300">{search}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-4">
                  <h3 className="font-medium text-white mb-3">Trending topics</h3>
                  <div className="space-y-2">
                    {trendingTopics.map((topic, index) => (
                      <button
                        key={index}
                        onClick={() => selectSuggestion(topic)}
                        className="flex items-center gap-3 w-full text-left p-2 hover:bg-korus-surface/60 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4 text-korus-primary" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
                        </svg>
                        <span className="text-gray-300">#{topic}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                  if (hasSearched) {
                    performSearch(searchQuery, category);
                  }
                }}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-medium'
                    : 'bg-korus-surface/30 backdrop-blur-sm border border-korus-borderLight text-gray-300 hover:border-korus-border'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>

          {/* Results Section */}
          {hasSearched && (
            <>
              {/* Tabs */}
              <div className="flex items-center gap-4 mb-6 border-b border-korus-borderLight">
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`pb-3 px-1 transition-colors ${
                    activeTab === 'posts'
                      ? 'text-korus-primary border-b-2 border-korus-primary'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Posts ({searchResults.length})
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`pb-3 px-1 transition-colors ${
                    activeTab === 'users'
                      ? 'text-korus-primary border-b-2 border-korus-primary'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Users ({userResults.length})
                </button>
              </div>

              {/* Loading */}
              {isLoading && (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-korus-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-400">Searching...</p>
                </div>
              )}

              {/* Results */}
              {!isLoading && (
                <>
                  {activeTab === 'posts' && (
                    <div className="space-y-4">
                      {searchResults.length === 0 ? (
                        <div className="text-center py-12">
                          <svg className="w-16 h-16 text-korus-textSecondary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                          </svg>
                          <h3 className="text-xl font-semibold mb-2 text-korus-text">No posts found</h3>
                          <p className="text-korus-textSecondary text-sm mb-6">
                            Try different keywords, check for typos, or explore trending topics.
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                              onClick={() => setSearchQuery('')}
                              className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-200 hover:scale-105"
                            >
                              Clear Search
                            </button>
                            <button
                              onClick={() => setSelectedCategory('all')}
                              className="bg-korus-surface/40 border border-korus-borderLight text-korus-text font-semibold px-6 py-3 rounded-xl hover:bg-korus-surface/60 transition-all duration-200"
                            >
                              Show All Categories
                            </button>
                          </div>
                        </div>
                      ) : (
                        searchResults.map((post) => (
                          <Link key={post.id} href={`/post/${post.id}`}>
                            <div className="bg-korus-surface/30 backdrop-blur-sm border border-korus-borderLight rounded-2xl p-6 hover:border-korus-border transition-all cursor-pointer">
                              {/* Post Header */}
                              <div className="flex items-start gap-4 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center text-sm font-bold text-black flex-shrink-0">
                                  {post.userAvatar || post.userWallet.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-white font-semibold">{post.user}</span>
                                    {post.isPremium && (
                                      <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                                        <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                                        </svg>
                                      </div>
                                    )}
                                    <span className="text-gray-400 text-sm">{post.timeAgo}</span>
                                  </div>
                                  <p className="text-gray-300">{post.content}</p>
                                </div>
                              </div>

                              {/* Post Image */}
                              {post.imageUrl && (
                                <div className="mb-4">
                                  <img src={post.imageUrl} alt="Post image" className="w-full rounded-xl max-h-64 object-cover" />
                                </div>
                              )}

                              {/* Post Stats */}
                              <div className="flex items-center gap-6 text-gray-400 text-sm">
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                                  </svg>
                                  {post.likes}
                                </span>
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                                  </svg>
                                  {post.replies}
                                </span>
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                                  </svg>
                                  {post.tips}
                                </span>
                              </div>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'users' && (
                    <div className="space-y-4">
                      {userResults.length === 0 ? (
                        <div className="text-center py-12">
                          <svg className="w-16 h-16 text-korus-textSecondary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                          </svg>
                          <h3 className="text-xl font-semibold mb-2 text-korus-text">No users found</h3>
                          <p className="text-korus-textSecondary text-sm mb-6">
                            Try searching for usernames, wallet addresses, or SNS domains.
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                              onClick={() => setActiveTab('posts')}
                              className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-200 hover:scale-105"
                            >
                              Search Posts Instead
                            </button>
                            <button
                              onClick={() => setSearchQuery('')}
                              className="bg-korus-surface/40 border border-korus-borderLight text-korus-text font-semibold px-6 py-3 rounded-xl hover:bg-korus-surface/60 transition-all duration-200"
                            >
                              Clear Search
                            </button>
                          </div>
                        </div>
                      ) : (
                        userResults.map((user) => (
                          <Link key={user.wallet} href={`/profile?wallet=${user.wallet}`}>
                            <div className="bg-korus-surface/30 backdrop-blur-sm border border-korus-borderLight rounded-2xl p-6 hover:border-korus-border transition-all cursor-pointer">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center text-lg font-bold text-black">
                                  {user.avatar || user.wallet.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-white font-semibold">{user.username || `${user.wallet.slice(0, 8)}...`}</span>
                                    {user.isPremium && (
                                      <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                                        <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-gray-400 text-sm font-mono">{user.wallet}</p>
                                  <div className="flex items-center gap-4 mt-2 text-gray-400 text-sm">
                                    <span>{user.followers.toLocaleString()} followers</span>
                                    <span>{user.reputation.toLocaleString()} reputation</span>
                                  </div>
                                </div>
                                <button className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-4 py-2 rounded-lg hover:shadow-lg transition-all">
                                  Follow
                                </button>
                              </div>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Empty State for no search */}
          {!hasSearched && !isLoading && (
            <div className="text-center py-12">
              <svg className="w-20 h-20 text-gray-400 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <h2 className="text-2xl font-bold mb-4">Search Korus</h2>
              <p className="text-gray-400 mb-8">Find posts, users, and topics you're interested in</p>

              {/* Trending Topics */}
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-semibold mb-4">Trending topics</h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {trendingTopics.map((topic, index) => (
                    <button
                      key={index}
                      onClick={() => selectSuggestion(topic)}
                      className="bg-korus-surface/30 backdrop-blur-sm border border-korus-borderLight px-3 py-1 rounded-full text-sm hover:border-korus-border transition-colors"
                    >
                      #{topic}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="hidden lg:block lg:w-96 xl:w-96 fixed right-0 top-0 h-full border-l border-korus-border bg-korus-surface/5 backdrop-blur-sm">
            {/* Right sidebar content would go here */}
          </div>
        </div>
      </div>
    </main>
  );
}