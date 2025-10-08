'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Post as BasePost } from '@/types';

// SearchModal needs to handle both formats during migration
interface Post extends Omit<BasePost, 'replies'> {
  replies: number | any[];
  replyThreads?: any[];
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  allPosts: Post[];
}

export default function SearchModal({ isOpen, onClose, allPosts }: SearchModalProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const categories = ['All', 'General', 'Games', 'Events'];

  // Load search history from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('searchHistory');
      if (saved) {
        setSearchHistory(JSON.parse(saved));
      }
    }
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Calculate relevance score for sorting
  const calculateRelevanceScore = useCallback((post: Post, query: string): number => {
    if (!query.trim()) return post.likes + post.tips;

    const lowerQuery = query.toLowerCase();
    let score = 0;

    // Content matches score highest
    if (post.content.toLowerCase().includes(lowerQuery)) {
      score += 10;
    }

    // User/wallet matches
    if (post.user.toLowerCase().includes(lowerQuery) ||
        post.wallet.toLowerCase().includes(lowerQuery)) {
      score += 8;
    }

    // Category matches
    if (post.category?.toLowerCase().includes(lowerQuery)) {
      score += 5;
    }

    // Reply matches (check replyThreads if replies is a number)
    const replyArray = Array.isArray(post.replies) ? post.replies : (post.replyThreads || []);
    replyArray.forEach(reply => {
      if (reply.content?.toLowerCase().includes(lowerQuery)) {
        score += 2;
      }
    });

    // Boost by engagement
    const replyCount = typeof post.replies === 'number' ? post.replies : post.replies.length;
    score += (post.likes * 0.5) + (post.tips * 1) + (replyCount * 0.3);

    return score;
  }, []);

  // Perform search
  const performSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setIsLoading(true);
    setHasSearched(true);

    // Add to search history
    if (query.trim() && !searchHistory.includes(query.trim())) {
      const newHistory = [query.trim(), ...searchHistory.slice(0, 9)];
      setSearchHistory(newHistory);
      if (typeof window !== 'undefined') {
        localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      }
    }

    setTimeout(() => {
      let results = [...allPosts];

      // Filter by query
      if (query.trim()) {
        const lowerQuery = query.toLowerCase();
        results = results.filter(post => {
          // Check replyThreads if replies is a number
          const replyArray = Array.isArray(post.replies) ? post.replies : (post.replyThreads || []);
          const hasReplyMatch = replyArray.some(r => r.content?.toLowerCase().includes(lowerQuery));

          return (
            post.content.toLowerCase().includes(lowerQuery) ||
            post.user.toLowerCase().includes(lowerQuery) ||
            post.wallet.toLowerCase().includes(lowerQuery) ||
            post.category?.toLowerCase().includes(lowerQuery) ||
            hasReplyMatch
          );
        });
      }

      // Filter by category
      if (selectedCategory) {
        results = results.filter(post =>
          post.category?.toLowerCase() === selectedCategory.toLowerCase()
        );
      }

      // Sort by relevance
      results.sort((a, b) => {
        const aScore = calculateRelevanceScore(a, query);
        const bScore = calculateRelevanceScore(b, query);
        return bScore - aScore;
      });

      setSearchResults(results);
      setIsLoading(false);
      setShowHistory(false);
    }, 300);
  }, [allPosts, selectedCategory, searchHistory, calculateRelevanceScore]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category === 'All' ? null : category.toLowerCase());
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('searchHistory');
    }
  };

  const handleHistoryClick = (query: string) => {
    setSearchQuery(query);
    performSearch(query);
  };

  const handlePostClick = (postId: number) => {
    router.push(`/post/${postId}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto pt-20 pb-20">
      <div className="relative w-full max-w-2xl mx-4">
        <div className="bg-korus-dark-200/95 backdrop-blur-xl border-2 border-korus-primary/30 rounded-3xl shadow-2xl shadow-korus-primary/20 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-korus-border">
            <h2 className="text-2xl font-bold text-white">Search Korus</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-korus-surface/20 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-korus-textSecondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Input */}
          <div className="p-6 border-b border-korus-border">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <svg className="w-5 h-5 text-korus-textSecondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowHistory(true)}
                  onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                  placeholder="Search posts, users, or categories..."
                  className="w-full pl-12 pr-24 py-3 bg-korus-surface/40 border border-korus-borderLight rounded-xl text-white placeholder-korus-textTertiary focus:outline-none focus:border-korus-primary focus:ring-2 focus:ring-korus-primary/20 transition-all"
                />
                {searchQuery && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-korus-primary/20 hover:bg-korus-primary/30 text-korus-primary text-sm font-semibold rounded-lg border border-korus-primary/30 transition-all"
                    >
                      Search
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        setHasSearched(false);
                      }}
                      className="p-1.5 hover:bg-korus-surface/20 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4 text-korus-textSecondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </form>

            {/* Search History */}
            {showHistory && searchHistory.length > 0 && (
              <div className="mt-3 p-3 bg-korus-surface/30 border border-korus-borderLight rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-korus-textSecondary uppercase">Recent Searches</span>
                  <button
                    onClick={clearSearchHistory}
                    className="text-xs text-korus-primary hover:text-korus-primary/80 font-medium"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-1">
                  {searchHistory.slice(0, 5).map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleHistoryClick(item)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-korus-surface/40 rounded-lg transition-colors text-left"
                    >
                      <svg className="w-4 h-4 text-korus-textTertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-korus-textSecondary">{item}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category Filters */}
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => handleCategoryClick(category)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                    (category === 'All' && !selectedCategory) || selectedCategory === category.toLowerCase()
                      ? 'bg-korus-primary/20 text-korus-primary border-2 border-korus-primary/30'
                      : 'bg-korus-surface/40 text-korus-textSecondary border border-korus-borderLight hover:bg-korus-surface/60'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Search Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {/* Search Info */}
            <div className="px-6 py-3 bg-korus-surface/20 border-b border-korus-border">
              <p className="text-sm text-korus-textSecondary">
                {searchQuery ? (
                  <>
                    <span className="font-semibold text-korus-primary">{searchResults.length}</span> results for "{searchQuery}"
                    {selectedCategory && <span className="ml-2">in <span className="font-semibold text-korus-primary capitalize">{selectedCategory}</span></span>}
                  </>
                ) : (
                  'Search posts, users, or categories'
                )}
              </p>
              {!searchQuery && (
                <p className="text-xs text-korus-textTertiary mt-1 italic">
                  💡 Try searching by wallet address, content, or category
                </p>
              )}
            </div>

            {/* Results */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-korus-primary/30 border-t-korus-primary rounded-full animate-spin mb-4 mx-auto"></div>
                  <p className="text-korus-primary font-medium">Searching...</p>
                </div>
              </div>
            ) : hasSearched ? (
              searchResults.length > 0 ? (
                <div className="divide-y divide-korus-border">
                  {searchResults.map(post => (
                    <div
                      key={post.id}
                      onClick={() => handlePostClick(post.id)}
                      className="p-6 hover:bg-korus-surface/10 transition-colors cursor-pointer"
                    >
                      <div className="flex gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center text-black font-bold flex-shrink-0">
                          {post.user.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Link
                              href={`/profile/${post.wallet}`}
                              onClick={(e) => e.stopPropagation()}
                              className={`font-bold hover:underline ${post.isShoutout ? 'text-korus-primary' : 'text-white'}`}
                            >
                              {post.user}
                            </Link>
                            <span className="text-korus-textTertiary text-sm">• {post.time}</span>
                            {post.category && (
                              <span className="px-2 py-0.5 bg-korus-primary/20 text-korus-primary text-xs font-medium rounded-full capitalize">
                                {post.category}
                              </span>
                            )}
                          </div>
                          <p className="text-korus-text text-sm mb-3 line-clamp-3">{post.content}</p>
                          {post.imageUrl && (
                            <img src={post.imageUrl} alt="Post" className="rounded-xl mb-3 max-h-40 object-cover" />
                          )}
                          <div className="flex items-center gap-4 text-korus-textSecondary text-sm">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                              {post.likes}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              {typeof post.replies === 'number' ? post.replies : post.replies.length}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                              {post.tips}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-6">
                  <div className="text-6xl mb-4 opacity-50">🔍</div>
                  <h3 className="text-xl font-bold text-white mb-2">No results found</h3>
                  <p className="text-korus-textSecondary text-center">
                    Try adjusting your search terms or browse by category
                  </p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-6">
                <div className="text-6xl mb-4 opacity-50">🔎</div>
                <p className="text-korus-textSecondary text-center">
                  Start typing to search posts and users
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
