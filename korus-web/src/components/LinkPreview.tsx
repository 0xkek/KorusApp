'use client';

import { useEffect, useState, useCallback } from 'react';

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  type?: 'video' | 'article' | 'website';
}

interface LinkPreviewProps {
  url: string;
}

export default function LinkPreview({ url }: LinkPreviewProps) {
  const [previewData, setPreviewData] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const extractYouTubeId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  const fetchPreviewData = useCallback(async () => {
    try {
      let mockData: LinkPreviewData = {
        url: url,
        type: 'website'
      };

      // YouTube detection
      if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
        const videoId = extractYouTubeId(url);
        mockData = {
          url: url,
          title: 'YouTube Video',
          description: 'Watch this video on YouTube',
          image: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : undefined,
          siteName: 'YouTube',
          type: 'video'
        };
      }
      // GitHub detection
      else if (url.includes('github.com')) {
        mockData = {
          url: url,
          title: 'GitHub Repository',
          description: 'View this repository on GitHub',
          image: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
          siteName: 'GitHub',
          type: 'article'
        };
      }
      // Twitter/X detection
      else if (url.includes('twitter.com') || url.includes('x.com')) {
        mockData = {
          url: url,
          title: 'Post on X',
          description: 'View this post on X (formerly Twitter)',
          siteName: 'X',
          type: 'article'
        };
      }
      // Solana detection
      else if (url.includes('solana.com')) {
        mockData = {
          url: url,
          title: 'Solana Documentation',
          description: 'Build on the fastest blockchain',
          image: 'https://solana.com/src/img/branding/solanaLogoMark.png',
          siteName: 'Solana',
          type: 'article'
        };
      }

      setPreviewData(mockData);
      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchPreviewData();
  }, [fetchPreviewData]);

  const handlePress = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="my-3 p-4 rounded-xl border border-korus-dark-400 bg-korus-dark-300/50 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-korus-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !previewData) {
    // Fallback to simple link
    return (
      <button
        onClick={handlePress}
        className="text-korus-primary text-sm underline hover:text-korus-secondary transition-colors"
      >
        {url}
      </button>
    );
  }

  return (
    <button
      onClick={handlePress}
      className="my-3 w-full rounded-xl overflow-hidden border border-korus-dark-400 bg-gradient-to-br from-korus-dark-300/40 to-korus-dark-400/20 hover:border-korus-primary/40 transition-all group"
    >
      {previewData.image && (
        <div className="relative w-full h-[180px] bg-black">
          <img
            src={previewData.image}
            alt={previewData.title || 'Link preview'}
            className="w-full h-full object-cover"
          />
          {previewData.type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-black/70 to-black/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg
                  className="w-6 h-6 text-white ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-4 text-left">
        {previewData.siteName && (
          <div className="flex items-center gap-1.5 mb-2">
            <svg
              className="w-3 h-3 text-korus-textSecondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {previewData.type === 'video' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              )}
            </svg>
            <span className="text-xs text-korus-textSecondary uppercase font-medium tracking-wider">
              {previewData.siteName}
            </span>
          </div>
        )}

        {previewData.title && (
          <h3 className="text-white font-semibold text-base mb-1.5 line-clamp-2">
            {previewData.title}
          </h3>
        )}

        {previewData.description && (
          <p className="text-korus-textSecondary text-sm mb-2.5 line-clamp-2">
            {previewData.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-korus-primary text-xs truncate flex-1">
            {url}
          </span>
          <svg
            className="w-3.5 h-3.5 text-korus-primary ml-2 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
      </div>
    </button>
  );
}
