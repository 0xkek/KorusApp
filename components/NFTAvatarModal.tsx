import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Fonts, FontSizes } from '../constants/Fonts';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import { fetchNFTsFromWallet, getFallbackNFTImage, NFT } from '../utils/nft';
import { Ionicons } from '@expo/vector-icons';
import { OptimizedImage } from './OptimizedImage';

interface NFTAvatarModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectNFT: (nft: NFT) => void;
  onSelectEmoji: () => void;
}

export default function NFTAvatarModal({
  visible,
  onClose,
  onSelectNFT,
  onSelectEmoji,
}: NFTAvatarModalProps) {
  const { walletAddress } = useWallet();
  const { colors, gradients, isDarkMode } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showSpam, setShowSpam] = useState(false);
  const [spamStats, setSpamStats] = useState({ filtered: 0, total: 0 });

  useEffect(() => {
    if (visible && walletAddress) {
      setPage(1);
      loadNFTs(1, false);
    }
  }, [visible, walletAddress]);

  const loadNFTs = async (pageNum: number = 1, append: boolean = false) => {
    if (!walletAddress) {
      console.error('NFTAvatarModal: No wallet address available');
      setLoading(false);
      return;
    }
    
    console.log(`NFTAvatarModal: Loading NFTs page ${pageNum} for wallet:`, walletAddress);
    
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const result = await fetchNFTsFromWallet(walletAddress, {
        page: pageNum,
        limit: 20,
        includeSpam: showSpam
      });
      
      console.log('NFTAvatarModal: Received', result.nfts.length, 'NFTs');
      
      if (append) {
        setNfts(prev => [...prev, ...result.nfts]);
      } else {
        setNfts(result.nfts);
      }
      
      setHasMore(result.hasMore);
      setSpamStats({
        filtered: result.spamFiltered || 0,
        total: result.totalBeforeFilter || 0
      });
    } catch (error) {
      console.error('NFTAvatarModal: Error loading NFTs:', error);
      if (!append) setNfts([]);
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
    // Reload with new filter settings
    loadNFTs(1, false);
  };

  const handleSelect = (nft: NFT) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedNFT(nft);
    // Immediately select the NFT
    onSelectNFT(nft);
    onClose();
  };

  const handleConfirm = () => {
    if (selectedNFT) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSelectNFT(selectedNFT);
      onClose();
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedNFT(null);
    onClose();
  };

  const handleImageError = (mint: string) => {
    setImageErrors(prev => new Set(prev).add(mint));
  };

  const getImageSource = (nft: NFT) => {
    if (imageErrors.has(nft.mint) || !nft.image) {
      return getFallbackNFTImage(nft);
    }
    return nft.image;
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlayBackground }]}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        
        <View style={[
          styles.modalContent,
          {
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
          }
        ]}>
          <BlurView intensity={40} style={styles.blurWrapper}>
            <LinearGradient
              colors={gradients.surface}
              style={styles.contentContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Choose NFT Avatar</Text>
                <TouchableOpacity onPress={handleClose} style={[
                  styles.closeButton,
                  {
                    backgroundColor: colors.surfaceLight + '1A',
                    borderColor: colors.border,
                  }
                ]}>
                  <Ionicons 
                    name="close" 
                    size={24} 
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Current Selection Preview */}
              {selectedNFT && (
                <View style={styles.previewContainer}>
                  <View style={[
                    styles.previewImageContainer,
                    {
                      borderColor: colors.primary,
                      shadowColor: colors.shadowColor,
                    }
                  ]}>
                    <OptimizedImage 
                      source={{ uri: getImageSource(selectedNFT) }}
                      style={styles.previewImage}
                      priority="high"
                    />
                  </View>
                  <Text style={[styles.previewName, { color: colors.text }]}>{selectedNFT.name}</Text>
                  {selectedNFT.collection && (
                    <Text style={[styles.previewCollection, { color: colors.textTertiary }]}>{selectedNFT.collection.name}</Text>
                  )}
                </View>
              )}

              {/* Content */}
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textTertiary }]}>Loading your NFTs...</Text>
                </View>
              ) : (
                <>
                  {/* Spam filter toggle */}
                  {spamStats.filtered > 0 && (
                    <View style={styles.filterBar}>
                      <Text style={[styles.filterText, { color: colors.textSecondary }]}>
                        {spamStats.filtered} spam NFTs hidden
                      </Text>
                      <TouchableOpacity
                        style={[styles.filterToggle, { backgroundColor: colors.primary + '20' }]}
                        onPress={toggleSpamFilter}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.filterToggleText, { color: colors.primary }]}>
                          {showSpam ? 'Hide Spam' : 'Show All'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  {nfts.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                    {walletAddress ? 'Unable to load NFTs at this time' : 'No wallet connected'}
                  </Text>
                  <Text style={[styles.emptySubtext, { color: colors.textTertiary, marginTop: 8 }]}>
                    Please try again later or use an emoji avatar
                  </Text>
                  <TouchableOpacity 
                    style={styles.emojiButton} 
                    onPress={() => {
                      onSelectEmoji();
                      onClose();
                    }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={gradients.primary}
                      style={styles.emojiButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={[styles.emojiButtonText, { color: isDarkMode ? '#000' : '#fff' }]}>Use Emoji Avatar Instead</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <ScrollView 
                    style={styles.nftGrid}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.gridContent}
                  >
                    <View style={styles.gridContainer}>
                      {nfts.map((nft) => (
                        <TouchableOpacity
                          key={nft.mint}
                          style={[
                            styles.nftItem,
                            { backgroundColor: colors.surfaceLight + '0D' },
                            selectedNFT?.mint === nft.mint && [
                              styles.nftItemSelected,
                              {
                                borderColor: colors.primary,
                                shadowColor: colors.shadowColor,
                              }
                            ]
                          ]}
                          onPress={() => handleSelect(nft)}
                          activeOpacity={0.8}
                        >
                          <OptimizedImage 
                            source={{ uri: getImageSource(nft) }}
                            style={styles.nftImage}
                            priority="medium"
                          />
                          <Text style={[styles.nftName, { color: colors.text }]} numberOfLines={1}>
                            {nft.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {/* Load More button */}
                    {hasMore && (
                      <TouchableOpacity
                        style={[
                          styles.loadMoreButton,
                          { backgroundColor: colors.primary + '20' }
                        ]}
                        onPress={handleLoadMore}
                        activeOpacity={0.8}
                        disabled={loadingMore}
                      >
                        {loadingMore ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                            Load More NFTs
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </ScrollView>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={[
                        styles.secondaryButton,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.surfaceLight + '0D',
                        }
                      ]} 
                      onPress={() => {
                        onSelectEmoji();
                        onClose();
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Use Emoji Instead</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[
                        styles.confirmButton,
                        { shadowColor: colors.shadowColor },
                        !selectedNFT && styles.confirmButtonDisabled
                      ]} 
                      onPress={handleConfirm}
                      activeOpacity={0.8}
                      disabled={!selectedNFT}
                    >
                      <LinearGradient
                        colors={selectedNFT ? gradients.primary : gradients.button}
                        style={styles.confirmButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={[styles.confirmButtonText, { color: isDarkMode ? '#000' : '#fff' }]}>Use NFT as Avatar</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              </>
              )}
            </LinearGradient>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: '95%',
    maxWidth: 500,
    height: '85%',
    maxHeight: 700,
    borderRadius: 24,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 35,
    elevation: 15,
    overflow: 'hidden',
  },
  blurWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    flex: 1,
  },
  contentContainer: {
    borderRadius: 24,
    padding: 24,
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  previewImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewName: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
  previewCollection: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginBottom: 16,
  },
  emojiButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  emojiButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emojiButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
  },
  nftGrid: {
    flex: 1,
    marginBottom: 16,
  },
  gridContent: {
    paddingBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  nftItem: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  nftItemSelected: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  nftImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceLight + '1A',
  },
  nftName: {
    padding: 12,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 10,
  },
  filterText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
  },
  filterToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  filterToggleText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
  },
  loadMoreButton: {
    marginTop: 20,
    marginBottom: 20,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
  },
  confirmButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 16,
  },
  confirmButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
  },
});