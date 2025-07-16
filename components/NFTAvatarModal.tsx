import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Fonts, FontSizes } from '../constants/Fonts';
import { useWallet } from '../context/WalletContext';
import { fetchNFTsFromWallet, getFallbackNFTImage, NFT } from '../utils/nft';

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedNFT(nft);
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
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        
        <View style={styles.modalContent}>
          <BlurView intensity={40} style={styles.blurWrapper}>
            <LinearGradient
              colors={[
                'rgba(25, 25, 25, 0.95)',
                'rgba(20, 20, 20, 0.98)',
                'rgba(15, 15, 15, 0.99)',
              ]}
              style={styles.contentContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose NFT Avatar</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Current Selection Preview */}
              {selectedNFT && (
                <View style={styles.previewContainer}>
                  <View style={styles.previewImageContainer}>
                    <Image 
                      source={{ uri: getImageSource(selectedNFT) }}
                      style={styles.previewImage}
                      onError={() => handleImageError(selectedNFT.mint)}
                    />
                  </View>
                  <Text style={styles.previewName}>{selectedNFT.name}</Text>
                  {selectedNFT.collection && (
                    <Text style={styles.previewCollection}>{selectedNFT.collection.name}</Text>
                  )}
                </View>
              )}

              {/* Content */}
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#43e97b" />
                  <Text style={styles.loadingText}>Loading your NFTs...</Text>
                </View>
              ) : nfts.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No NFTs found in your wallet</Text>
                  <TouchableOpacity 
                    style={styles.emojiButton} 
                    onPress={() => {
                      onSelectEmoji();
                      onClose();
                    }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#43e97b', '#38f9d7']}
                      style={styles.emojiButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.emojiButtonText}>Use Emoji Avatar Instead</Text>
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
                            selectedNFT?.mint === nft.mint && styles.nftItemSelected
                          ]}
                          onPress={() => handleSelect(nft)}
                          activeOpacity={0.8}
                        >
                          <Image 
                            source={{ uri: getImageSource(nft) }}
                            style={styles.nftImage}
                            onError={() => handleImageError(nft.mint)}
                          />
                          <Text style={styles.nftName} numberOfLines={1}>
                            {nft.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.secondaryButton} 
                      onPress={() => {
                        onSelectEmoji();
                        onClose();
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.secondaryButtonText}>Use Emoji Instead</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.confirmButton, !selectedNFT && styles.confirmButtonDisabled]} 
                      onPress={handleConfirm}
                      activeOpacity={0.8}
                      disabled={!selectedNFT}
                    >
                      <LinearGradient
                        colors={selectedNFT ? ['#43e97b', '#38f9d7'] : ['#333', '#444']}
                        style={styles.confirmButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.confirmButtonText}>Use NFT as Avatar</Text>
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

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    borderColor: 'rgba(67, 233, 123, 0.6)',
    shadowColor: '#43e97b',
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
    color: '#ffffff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: 'rgba(255, 255, 255, 0.7)',
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
    borderColor: '#43e97b',
    shadowColor: '#43e97b',
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
    color: '#ffffff',
    marginBottom: 4,
  },
  previewCollection: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: 'rgba(255, 255, 255, 0.6)',
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
    color: 'rgba(255, 255, 255, 0.6)',
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
    color: 'rgba(255, 255, 255, 0.6)',
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
    color: '#000000',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  nftItemSelected: {
    borderColor: '#43e97b',
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  nftImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  nftName: {
    padding: 12,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: '#ffffff',
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
    borderColor: 'rgba(67, 233, 123, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  secondaryButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#43e97b',
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
    color: '#000000',
  },
});