import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWallet } from '../context/WalletContext';
import { Fonts, FontSizes } from '../constants/Fonts';

interface WalletModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function WalletModal({ visible, onClose }: WalletModalProps) {
  const { walletAddress, balance, refreshBalance, getPrivateKey } = useWallet();
  const [showPrivateKey, setShowPrivateKey] = useState(false);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Copy to clipboard
    Alert.alert('Copied', 'Wallet address copied to clipboard');
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
            colors={['rgba(30, 30, 30, 0.95)', 'rgba(20, 20, 20, 0.98)']}
            style={styles.modalGradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>💰 Your Wallet</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Balance Section */}
            <View style={styles.balanceSection}>
              <Text style={styles.balanceLabel}>$ALLY Balance</Text>
              <Text style={styles.balanceAmount}>{balance.toFixed(2)}</Text>
              <TouchableOpacity onPress={handleRefreshBalance} style={styles.refreshButton}>
                <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
              </TouchableOpacity>
            </View>

            {/* Wallet Address */}
            <View style={styles.addressSection}>
              <Text style={styles.sectionTitle}>Wallet Address</Text>
              <TouchableOpacity onPress={handleCopyAddress} style={styles.addressContainer}>
                <BlurView intensity={25} style={styles.addressBlur}>
                  <Text style={styles.addressText} numberOfLines={1}>
                    {walletAddress}
                  </Text>
                  <Text style={styles.copyHint}>Tap to copy</Text>
                </BlurView>
              </TouchableOpacity>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity onPress={handleShowPrivateKey} style={styles.dangerButton}>
                <BlurView intensity={25} style={styles.actionBlur}>
                  <Text style={styles.dangerButtonText}>🔑 View Private Key</Text>
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
    borderColor: 'rgba(67, 233, 123, 0.4)',
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
  title: {
    fontSize: FontSizes['2xl'],
    fontFamily: Fonts.bold,
    color: '#43e97b',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(67, 233, 123, 0.1)',
  },
  balanceLabel: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: FontSizes['4xl'],
    fontFamily: Fonts.bold,
    color: '#43e97b',
    marginBottom: 12,
  },
  refreshButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  refreshButtonText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  addressSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: '#ffffff',
    marginBottom: 12,
  },
  addressContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addressBlur: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  addressText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.mono,
    color: '#43e97b',
    marginBottom: 4,
  },
  copyHint: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  actions: {
    marginBottom: 16,
  },
  dangerButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionBlur: {
    padding: 16,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: '#ff6b6b',
  },
  infoText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 16,
  },
});