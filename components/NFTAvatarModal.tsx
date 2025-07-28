import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Fonts, FontSizes } from '../constants/Fonts';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import { fetchNFTsFromWallet, getFallbackNFTImage, NFT } from '../utils/nft';
import { Ionicons } from '@expo/vector-icons';

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
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible && walletAddress) {
      loadNFTs();
    }
  }, [visible, walletAddress]);

  const loadNFTs = async () => {
    if (!walletAddress) return;
    
    setLoading(true);
    try {
      const fetchedNFTs = await fetchNFTsFromWallet(walletAddress);
      setNfts(fetchedNFTs);
    } catch (error) {
      console.error('Error loading NFTs:', error);
      setNfts([]);
    } finally {
      setLoading(false);
    }
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
                    <Image 
                      source={{ uri: getImageSource(selectedNFT) }}
                      style={styles.previewImage}
                      onError={() => handleImageError(selectedNFT.mint)}
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
              ) : nfts.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No NFTs found in your wallet</Text>
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
                          <Image 
                            source={{ uri: getImageSource(nft) }}
                            style={styles.nftImage}
                            onError={() => handleImageError(nft.mint)}
                          />
                          <Text style={[styles.nftName, { color: colors.text }]} numberOfLines={1}>
                            {nft.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
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