import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, Clipboard } from 'react-native';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import { Fonts, FontSizes } from '../constants/Fonts';
import { Ionicons } from '@expo/vector-icons';

interface WalletModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function WalletModal({ visible, onClose }: WalletModalProps) {
  const { walletAddress, balance, refreshBalance, getPrivateKey } = useWallet();
  const { colors, isDarkMode, gradients } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRefreshBalance = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await refreshBalance();
  };

  const handleShowPrivateKey = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    Alert.alert(
      'Warning',
      'Never share your private key with anyone. Anyone with your private key can access your wallet.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Show Private Key', 
          style: 'destructive',
          onPress: async () => {
            const privateKey = await getPrivateKey();
            if (privateKey) {
              Alert.alert(
                'Private Key',
                privateKey,
                [{ text: 'Close', style: 'default' }]
              );
            }
          }
        }
      ]
    );
  };

  const handleCopyAddress = () => {
    if (walletAddress) {
      Clipboard.setString(walletAddress);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <BlurView intensity={60} style={styles.modalContainer}>
          <LinearGradient
            colors={gradients.surface}
            style={styles.modalGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Ionicons 
                  name="wallet-outline" 
                  size={28} 
                  color={colors.primary}
                />
                <Text style={styles.title}>Your Wallet</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons 
                  name="close" 
                  size={24} 
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Balance Section */}
            <View style={styles.balanceSection}>
              <BlurView intensity={25} style={styles.balanceBlur}>
                <LinearGradient
                  colors={gradients.primary}
                  style={styles.balanceGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.balanceContent}>
                    <Text style={styles.balanceLabel}>$ALLY Balance</Text>
                    <Text style={styles.balanceAmount}>{balance.toFixed(2)}</Text>
                    <TouchableOpacity onPress={handleRefreshBalance} style={styles.refreshButton}>
                      <BlurView intensity={25} style={styles.refreshBlur}>
                        <LinearGradient
                          colors={gradients.button}
                          style={styles.refreshGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Ionicons 
                            name="refresh-outline" 
                            size={16} 
                            color={colors.textSecondary}
                          />
                          <Text style={styles.refreshButtonText}>Refresh</Text>
                        </LinearGradient>
                      </BlurView>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </BlurView>
            </View>

            {/* Wallet Address */}
            <View style={styles.addressSection}>
              <Text style={styles.sectionTitle}>Wallet Address</Text>
              <TouchableOpacity onPress={handleCopyAddress} style={styles.addressContainer}>
                <BlurView intensity={30} style={styles.addressBlur}>
                  <LinearGradient
                    colors={gradients.surface}
                    style={styles.addressGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.addressContent}>
                      <View style={styles.addressTextContainer}>
                        <Text style={styles.addressText} numberOfLines={1}>
                          {walletAddress}
                        </Text>
                      </View>
                      <View style={styles.copyIndicator}>
                        {copied ? (
                          <Ionicons 
                            name="checkmark-circle" 
                            size={20} 
                            color={colors.primary}
                          />
                        ) : (
                          <Ionicons 
                            name="copy-outline" 
                            size={20} 
                            color={colors.textSecondary}
                          />
                        )}
                      </View>
                    </View>
                    <Text style={styles.copyHint}>
                      {copied ? 'Copied to clipboard!' : 'Tap to copy'}
                    </Text>
                  </LinearGradient>
                </BlurView>
              </TouchableOpacity>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity onPress={handleShowPrivateKey} style={styles.dangerButton}>
                <BlurView intensity={25} style={styles.actionBlur}>
                  <LinearGradient
                    colors={gradients.surface}
                    style={styles.dangerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.dangerContent}>
                      <View style={styles.dangerIconContainer}>
                        <LinearGradient
                          colors={[colors.error, colors.error + 'DD']}
                          style={styles.dangerIconGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Ionicons 
                            name="key-outline" 
                            size={22} 
                            color={isDarkMode ? '#000' : '#fff'}
                          />
                        </LinearGradient>
                      </View>
                      <View style={styles.dangerTextContainer}>
                        <Text style={styles.dangerButtonText}>View Private Key</Text>
                        <Text style={styles.dangerWarning}>Sensitive - Keep secure</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </BlurView>
              </TouchableOpacity>
            </View>

            {/* Info */}
            <Text style={styles.infoText}>
              This is a demo wallet. In production, $ALLY would be a real SPL token on Solana.
            </Text>
          </LinearGradient>
        </BlurView>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.modalBackground,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary + '66',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 35,
    elevation: 15,
  },
  modalGradient: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: FontSizes['2xl'],
    fontFamily: Fonts.bold,
    color: colors.primary,
    textShadowColor: colors.primary + '66',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceSection: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  balanceBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  balanceGradient: {
    borderRadius: 20,
  },
  balanceContent: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  balanceLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: isDarkMode ? '#000000' : '#ffffff',
    opacity: 0.8,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: FontSizes['5xl'],
    fontFamily: Fonts.bold,
    color: isDarkMode ? '#000000' : '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: 16,
  },
  refreshButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  refreshBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  refreshGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refreshButtonText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: colors.textSecondary,
  },
  addressSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: colors.text,
    marginBottom: 12,
  },
  addressContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addressBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  addressGradient: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  addressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addressTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  copyIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.mono,
    color: colors.text,
    letterSpacing: -0.5,
  },
  copyHint: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    marginBottom: 16,
  },
  dangerButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  dangerGradient: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.error + '1A',
  },
  dangerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dangerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  dangerIconGradient: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerTextContainer: {
    flex: 1,
  },
  dangerButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: colors.error,
    marginBottom: 2,
  },
  dangerWarning: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: colors.error + 'CC',
  },
  infoText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
});