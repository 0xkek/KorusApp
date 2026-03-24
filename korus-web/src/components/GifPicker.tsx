'use client';
import { logger } from '@/utils/logger';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

interface TenorGif {
  id: string;
  media_formats: {
    gif: {
      url: string;
      dims: number[];
    };
    tinygif: {
      url: string;
    };
  };
  content_description: string;
}

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch trending GIFs on mount
  useEffect(() => {
    fetchTrendingGifs();
  }, []);

  const fetchTrendingGifs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tenor?type=featured&limit=20');
      const data = await response.json();
      setGifs(data.results || []);
    } catch (error) {
      logger.error('Failed to fetch trending GIFs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      fetchTrendingGifs();
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/tenor?q=${encodeURIComponent(query)}&limit=20`
      );
      const data = await response.json();
      setGifs(data.results || []);
    } catch (error) {
      logger.error('Failed to search GIFs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchGifs(searchQuery);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1e1e1e] border border-[#262626] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#262626] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#fafafa]">Choose a GIF</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-white/[0.08] text-neutral-400 hover:text-[#fafafa] duration-150 flex items-center justify-center"
            aria-label="Close GIF picker"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="p-4 border-b border-[#262626]">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for GIFs..."
              className="w-full bg-white/[0.06] border border-[#262626] rounded-lg px-4 py-3 text-[#fafafa] placeholder-[#737373] focus:outline-none focus:border-korus-primary duration-150"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-korus-primary text-black px-4 py-1.5 rounded-lg font-semibold hover:bg-korus-secondary duration-150"
            >
              Search
            </button>
          </div>
        </form>

        {/* GIF Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-korus-primary"></div>
            </div>
          ) : gifs.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => {
                    onSelect(gif.media_formats.gif.url);
                    onClose();
                  }}
                  className="relative aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-korus-primary duration-150 group"
                >
                  <Image
                    src={gif.media_formats.tinygif.url}
                    alt={gif.content_description || 'GIF'}
                    fill
                    className="object-cover group-hover:scale-105 duration-150"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-[#a1a1a1]">
              <p>No GIFs found. Try a different search term.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#262626] text-center">
          <p className="text-xs text-[#737373]">
            Powered by <span className="text-korus-primary font-semibold">Tenor</span>
          </p>
        </div>
      </div>
    </div>
  );
}
