'use client';
import { logger } from '@/utils/logger';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';
import { nftsAPI, type NFT } from '@/lib/api';

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

  // Debug log
  logger.log('NFTAvatarModal render:', { isOpen, publicKey: publicKey?.toBase58() });

  useEffect(() => {
    if (isOpen && publicKey) {
      setNfts([]);
      setSelectedNFT(null);
      loadNFTs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, publicKey]);

  const loadNFTs = async () => {
    if (!publicKey) {
      logger.log('No publicKey, skipping NFT load');
      setLoading(false);
      return;
    }

    setLoading(true);
    logger.log('Loading NFTs for wallet:', publicKey.toString());

    try {
      const response = await nftsAPI.getNFTsForWallet(publicKey.toString());
      logger.log('NFT API response:', response);

      if (response.nfts && response.nfts.length > 0) {
        logger.log(`Found ${response.nfts.length} NFTs`);
        setNfts(response.nfts);
      } else {
        logger.log('No NFTs found in response');
        setNfts([]);
      }
    } catch (error) {
      logger.error('Error loading NFTs:', error);
      setNfts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (nft: NFT) => {
    setSelectedNFT(nft);
    onSelectNFT(nft);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-[var(--color-overlay-background)] backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-2xl shadow-2xl p-6 max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[var(--color-text)] text-2xl font-semibold">Choose NFT Avatar</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-white/[0.08] text-neutral-400 hover:text-[var(--color-text)] transition-colors duration-150 flex items-center justify-center"
          >
            <svg
              className="w-6 h-6"
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
            <p className="text-[var(--color-text-secondary)]">Loading your NFTs...</p>
          </div>
        ) : (
          <>
            {nfts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                <p className="text-[var(--color-text-secondary)] text-lg mb-2">
                  {publicKey ? 'No NFTs found in your wallet' : 'No wallet connected'}
                </p>
                <p className="text-[var(--color-text-tertiary)] text-sm">
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
                        className={`group relative bg-white/[0.04] rounded-xl overflow-hidden border-2 transition-all duration-150 hover:scale-105 hover:shadow-lg ${
                          selectedNFT?.mint === nft.mint || currentAvatarNFT === nft.mint
                            ? 'border-korus-primary shadow-lg shadow-korus-primary/50'
                            : 'border-transparent hover:border-[var(--color-border-light)]'
                        }`}
                      >
                        <div className="aspect-square relative bg-[var(--color-surface)]">
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
                                className="w-12 h-12 text-[var(--color-text-tertiary)]"
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
                          <p className="text-[var(--color-text)] text-sm font-medium truncate">
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
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
