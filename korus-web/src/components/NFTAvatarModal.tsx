'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';

interface NFT {
  name: string;
  symbol: string;
  uri: string;
  image?: string;
  mint: string;
  collection?: {
    name: string;
    family?: string;
  };
}

interface NFTAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNFT: (nft: NFT) => void;
  currentAvatarNFT?: string | null;
}

export default function NFTAvatarModal({
  isOpen,
  onClose,
  onSelectNFT,
  currentAvatarNFT,
}: NFTAvatarModalProps) {
  const { publicKey } = useWallet();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showSpam, setShowSpam] = useState(false);
  const [spamStats, setSpamStats] = useState({ filtered: 0, total: 0 });

  useEffect(() => {
    if (isOpen && publicKey) {
      setNfts([]);
      setPage(1);
      setHasMore(true);
      setSelectedNFT(null);
      loadNFTs(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, publicKey]);

  const loadNFTs = async (pageNum: number = 1, append: boolean = false) => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(
        `${apiUrl}/nfts/wallet/${publicKey.toString()}?page=${pageNum}&limit=20&includeSpam=${showSpam}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch NFTs');
      }

      const data = await response.json();

      if (data.success && data.nfts && data.nfts.length > 0) {
        if (append) {
          setNfts((prev) => [...prev, ...data.nfts]);
        } else {
          setNfts(data.nfts);
        }

        setHasMore(data.hasMore || false);
        setSpamStats({
          filtered: data.spamFiltered || 0,
          total: data.totalBeforeFilter || 0,
        });
      } else {
        if (!append) setNfts([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading NFTs:', error);
      if (!append) setNfts([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadNFTs(nextPage, true);
    }
  };

  const toggleSpamFilter = () => {
    setShowSpam(!showSpam);
    setPage(1);
    setNfts([]);
    loadNFTs(1, false);
  };

  const handleSelect = (nft: NFT) => {
    setSelectedNFT(nft);
    onSelectNFT(nft);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-korus-surface/90 backdrop-blur-xl border border-korus-border rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-korus-text text-2xl font-bold">Choose NFT Avatar</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-korus-surface/40 rounded-full flex items-center justify-center hover:bg-korus-surface/60 transition-colors"
          >
            <svg
              className="w-6 h-6 text-korus-text"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-korus-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-korus-textSecondary">Loading your NFTs...</p>
          </div>
        ) : (
          <>
            {/* Spam filter toggle */}
            {spamStats.filtered > 0 && (
              <div className="flex items-center justify-between mb-4 p-3 bg-korus-surface/20 rounded-xl">
                <span className="text-korus-textSecondary text-sm">
                  {spamStats.filtered} spam NFTs hidden
                </span>
                <button
                  onClick={toggleSpamFilter}
                  className="px-4 py-2 bg-korus-primary/20 text-korus-primary rounded-lg text-sm font-semibold hover:bg-korus-primary/30 transition-colors"
                >
                  {showSpam ? 'Hide Spam' : 'Show All'}
                </button>
              </div>
            )}

            {nfts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                <p className="text-korus-textSecondary text-lg mb-2">
                  {publicKey ? 'No NFTs found in your wallet' : 'No wallet connected'}
                </p>
                <p className="text-korus-textTertiary text-sm">
                  Your NFTs will appear here once they&apos;re loaded
                </p>
              </div>
            ) : (
              <>
                {/* NFT Grid */}
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                    {nfts.map((nft) => (
                      <button
                        key={nft.mint}
                        onClick={() => handleSelect(nft)}
                        className={`group relative bg-korus-surface/20 rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                          selectedNFT?.mint === nft.mint || currentAvatarNFT === nft.mint
                            ? 'border-korus-primary shadow-lg shadow-korus-primary/50'
                            : 'border-transparent hover:border-korus-border'
                        }`}
                      >
                        <div className="aspect-square relative bg-korus-dark-200">
                          {nft.image ? (
                            <Image
                              src={nft.image}
                              alt={nft.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, 25vw"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg
                                className="w-12 h-12 text-korus-textTertiary"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="p-3 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0">
                          <p className="text-white text-sm font-medium truncate">
                            {nft.name}
                          </p>
                          {nft.collection?.name && (
                            <p className="text-white/70 text-xs truncate">
                              {nft.collection.name}
                            </p>
                          )}
                        </div>
                        {(selectedNFT?.mint === nft.mint || currentAvatarNFT === nft.mint) && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-korus-primary rounded-full flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-black"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Load More Button */}
                  {hasMore && (
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="w-full py-3 bg-korus-primary/20 text-korus-primary rounded-xl font-semibold hover:bg-korus-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingMore ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-korus-primary border-t-transparent rounded-full animate-spin" />
                          Loading...
                        </div>
                      ) : (
                        'Load More NFTs'
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
