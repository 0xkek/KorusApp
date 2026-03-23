'use client';
import { logger } from '@/utils/logger';
import Image from 'next/image';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { Post as BasePost, Reply } from '@/types';

// SearchModal needs to handle both formats during migration
interface Post extends Omit<BasePost, 'replies'> {
  replies: number | Reply[];
  replyThreads?: Reply[];
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
  const modalRef = useFocusTrap(isOpen);

  const categories = ['All', 'General', 'Games', 'Events'];

  // Load search history from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('searchHistory');
        if (saved) {
          setSearchHistory(JSON.parse(saved));
        }
      } catch {
        // If localStorage is unavailable or data is corrupted, silently fail
        setSearchHistory([]);
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
        post.wallet?.toLowerCase().includes(lowerQuery)) {
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
  const performSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    setIsLoading(true);
    setHasSearched(true);

    // Add to search history
    if (query.trim() && !searchHistory.includes(query.trim())) {
      const newHistory = [query.trim(), ...searchHistory.slice(0, 9)];
      setSearchHistory(newHistory);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('searchHistory', JSON.stringify(newHistory));
        } catch {
          // Silently fail if localStorage is unavailable
        }
      }
    }

    try {
      // Use backend search API
      const { searchAPI } = await import('@/lib/api');
      const results = await searchAPI.search({
        query: query.trim(),
        limit: 50
      });

      // Transform backend results to match expected format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformedPosts = results.posts.map((post: any) => ({
        ...post,
        user: post.author?.username || post.author?.snsUsername || post.authorWallet,
        wallet: post.authorWallet,
        category: post.topic,
        likes: post.likeCount || 0,
        tips: post.tipCount || 0,
        replies: post.replyCount || 0,
        timestamp: post.createdAt
      }));

      // Filter by category if selected
      let finalResults = transformedPosts;
      if (selectedCategory) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        finalResults = transformedPosts.filter((post: any) =>
          post.category?.toLowerCase() === selectedCategory.toLowerCase()
        );
      }

      setSearchResults(finalResults);
      setShowHistory(false);
    } catch (error) {
      logger.error('Search failed:', error);
      // Fallback to local search if API fails
      let results = [...allPosts];

      if (query.trim()) {
        const lowerQuery = query.toLowerCase();
        results = results.filter(post => {
          const replyArray = Array.isArray(post.replies) ? post.replies : (post.replyThreads || []);
          const hasReplyMatch = replyArray.some(r => r.content?.toLowerCase().includes(lowerQuery));

          return (
            post.content.toLowerCase().includes(lowerQuery) ||
            post.user.toLowerCase().includes(lowerQuery) ||
            post.wallet?.toLowerCase().includes(lowerQuery) ||
            post.category?.toLowerCase().includes(lowerQuery) ||
            hasReplyMatch
          );
        });
      }

      if (selectedCategory) {
        results = results.filter(post =>
          post.category?.toLowerCase() === selectedCategory.toLowerCase()
        );
      }

      results.sort((a, b) => {
        const aScore = calculateRelevanceScore(a, query);
        const bScore = calculateRelevanceScore(b, query);
        return bScore - aScore;
      });

      setSearchResults(results);
    } finally {
      setIsLoading(false);
    }
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
      try {
        localStorage.removeItem('searchHistory');
      } catch {
        // Silently fail if localStorage is unavailable
      }
    }
  };

  const handleHistoryClick = (query: string) => {
    setSearchQuery(query);
    performSearch(query);
  };

  const handlePostClick = (postId: string | number) => {
    router.push(`/post/${postId}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto pt-20 pb-20">
      <div ref={modalRef} className="relative w-full max-w-2xl mx-4">
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
            <h2 className="text-2xl font-semibold text-[#fafafa]">Search Korus</h2>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-white/[0.08] text-neutral-400 hover:text-[#fafafa] transition-colors duration-150 flex items-center justify-center"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Input */}
          <div className="p-6 border-b border-[#2a2a2a]">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <svg className="w-5 h-5 text-[#a1a1a1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="w-full pl-12 pr-24 py-3 bg-white/[0.06] border border-[#2a2a2a] rounded-lg text-[#fafafa] placeholder-neutral-600 focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none transition-all"
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
                      className="p-1.5 hover:bg-white/[0.04] rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4 text-[#a1a1a1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </form>

            {/* Search History */}
            {showHistory && searchHistory.length > 0 && (
              <div className="mt-3 p-3 bg-white/[0.06] border border-[#2a2a2a] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#a1a1a1] uppercase">Recent Searches</span>
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
                      className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-white/[0.06] rounded-lg transition-colors text-left"
                    >
                      <svg className="w-4 h-4 text-[#737373] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-[#a1a1a1]">{item}</span>
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
                      : 'bg-white/[0.06] text-[#a1a1a1] border border-[#2a2a2a] hover:bg-white/[0.12]'
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
            <div className="px-6 py-3 bg-white/[0.04] border-b border-[#2a2a2a]">
              <p className="text-sm text-[#a1a1a1]">
                {searchQuery ? (
                  <>
                    <span className="font-semibold text-korus-primary">{searchResults.length}</span> results for &quot;{searchQuery}&quot;
                    {selectedCategory && <span className="ml-2">in <span className="font-semibold text-korus-primary capitalize">{selectedCategory}</span></span>}
                  </>
                ) : (
                  'Search posts, users, or categories'
                )}
              </p>
              {!searchQuery && (
                <p className="text-xs text-[#737373] mt-1 italic">
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
                <div className="divide-y divide-white/10">
                  {searchResults.map(post => (
                    <div
                      key={post.id}
                      onClick={() => handlePostClick(post.id)}
                      className="p-6 hover:bg-white/[0.04] transition-colors cursor-pointer"
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
                              className={`font-bold hover:underline ${post.isShoutout ? 'text-korus-primary' : 'text-[#fafafa]'}`}
                            >
                              {post.user}
                            </Link>
                            <span className="text-[#737373] text-sm">• {post.time}</span>
                            {post.category && (
                              <span className="px-2 py-0.5 bg-korus-primary/20 text-korus-primary text-xs font-medium rounded-full capitalize">
                                {post.category}
                              </span>
                            )}
                          </div>
                          <p className="text-[#fafafa] text-sm mb-3 line-clamp-3">{post.content}</p>
                          {post.imageUrl && (
                            <Image src={post.imageUrl} alt="Post" width={300} height={160} className="rounded-xl mb-3 h-auto" />
                          )}
                          <div className="flex items-center gap-4 text-[#a1a1a1] text-sm">
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
                  <h3 className="text-xl font-semibold text-[#fafafa] mb-2">No results found</h3>
                  <p className="text-[#a1a1a1] text-center">
                    Try adjusting your search terms or browse by category
                  </p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-6">
                <div className="text-6xl mb-4 opacity-50">🔎</div>
                <p className="text-[#a1a1a1] text-center">
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
