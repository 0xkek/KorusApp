import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, Clipboard, ScrollView } from 'react-native';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import { Fonts, FontSizes } from '../constants/Fonts';
import { Ionicons } from '@expo/vector-icons';
import SwapModal from './SwapModal';

interface WalletModalProps {
  visible: boolean;
  onClose: () => void;
}

interface Token {
  symbol: string;
  balance: number;
  usdValue?: number;
  icon?: string;
}

export default function WalletModal({ visible, onClose }: WalletModalProps) {
  const { walletAddress, balance, refreshBalance, getPrivateKey } = useWallet();
  const { colors, isDarkMode, gradients } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedTokenForSwap, setSelectedTokenForSwap] = useState<Token | null>(null);
  
  // Mock other tokens - more examples for scrolling
  const otherTokens: Token[] = [
    { symbol: 'SOL', balance: 2.45, usdValue: 122.50 },
    { symbol: 'USDC', balance: 150.00, usdValue: 150.00 },
    { symbol: 'BONK', balance: 1000000, usdValue: 25.00 },
    { symbol: 'WIF', balance: 50, usdValue: 75.00 },
    { symbol: 'PYTH', balance: 500, usdValue: 200.00 },
    { symbol: 'JTO', balance: 100, usdValue: 300.00 },
    { symbol: 'RNDR', balance: 20, usdValue: 120.00 },
    { symbol: 'MPLX', balance: 1000, usdValue: 50.00 },
    { symbol: 'ORCA', balance: 75, usdValue: 37.50 },
    { symbol: 'RAY', balance: 30, usdValue: 45.00 },
  ];
  
  // Sort tokens by USD value (highest first)
  const sortedTokens = [...otherTokens].sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0));

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

  const handleTokenClick = (token: Token) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTokenForSwap(token);
    setShowSwapModal(true);
  };

  const handleAllyClick = () => {
    const allyToken: Token = {
      symbol: 'ALLY',
      balance: balance,
      usdValue: balance * 0.5, // Mock USD value
    };
    handleTokenClick(allyToken);
  };

  return (
    <>
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
              {/* ALLY Balance Card */}
              <TouchableOpacity style={styles.allyCard} activeOpacity={0.8} onPress={handleAllyClick}>
                <LinearGradient
                  colors={gradients.primary}
                  style={styles.allyGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.allyContent}>
                    <View style={styles.allyLeft}>
                      <View style={styles.tokenIcon}>
                        <Text style={styles.tokenIconText}>A</Text>
                      </View>
                      <View>
                        <Text style={styles.allySymbol}>$ALLY</Text>
                        <Text style={styles.allyLabel}>Main Token</Text>
                      </View>
                    </View>
                    <View style={styles.allyRight}>
                      <Text style={styles.allyBalance}>{balance.toFixed(2)}</Text>
                      <TouchableOpacity onPress={handleRefreshBalance} style={styles.refreshIcon}>
                        <Ionicons 
                          name="refresh-outline" 
                          size={18} 
                          color={isDarkMode ? '#000' : '#fff'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Other Tokens Dropdown */}
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowTokenDropdown(!showTokenDropdown);
                }}
                activeOpacity={0.8}
              >
                <BlurView intensity={30} style={styles.dropdownBlur}>
                  <LinearGradient
                    colors={gradients.surface}
                    style={styles.dropdownGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.dropdownHeader}>
                      <Text style={styles.dropdownTitle}>Other Tokens</Text>
                      <Ionicons 
                        name={showTokenDropdown ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color={colors.textSecondary}
                      />
                    </View>
                  </LinearGradient>
                </BlurView>
              </TouchableOpacity>

              {/* Token List */}
              {showTokenDropdown && (
                <View style={styles.tokenListContainer}>
                  <BlurView intensity={30} style={styles.tokenListBlur}>
                    <LinearGradient
                      colors={gradients.surface}
                      style={styles.tokenListGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <ScrollView 
                        style={styles.tokenScrollView}
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled={true}
                      >
                        {sortedTokens.map((token, index) => (
                          <TouchableOpacity
                            key={token.symbol}
                            style={[
                              styles.tokenItem,
                              index === sortedTokens.length - 1 && styles.lastTokenItem
                            ]}
                            activeOpacity={0.7}
                            onPress={() => handleTokenClick(token)}
                          >
                            <View style={styles.tokenLeft}>
                              <LinearGradient
                                colors={[colors.primary + '30', colors.secondary + '20']}
                                style={[styles.tokenIcon, styles.smallTokenIcon]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                              >
                                <Text style={styles.smallTokenIconText}>
                                  {token.symbol.charAt(0)}
                                </Text>
                              </LinearGradient>
                              <View>
                                <Text style={styles.tokenSymbol}>{token.symbol}</Text>
                                {token.usdValue && (
                                  <Text style={styles.tokenUsd}>${token.usdValue.toFixed(2)} USD</Text>
                                )}
                              </View>
                            </View>
                            <View style={styles.tokenRight}>
                              <Text style={styles.tokenBalance}>
                                {token.balance.toLocaleString()}
                              </Text>
                              <Text style={styles.tokenBalanceLabel}>
                                {token.symbol}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      <View style={styles.totalValueContainer}>
                        <Text style={styles.totalValueLabel}>Total Portfolio Value</Text>
                        <Text style={styles.totalValueAmount}>
                          ${sortedTokens.reduce((sum, token) => sum + (token.usdValue || 0), 0).toFixed(2)}
                        </Text>
                      </View>
                    </LinearGradient>
                  </BlurView>
                </View>
              )}
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

    {/* Swap Modal */}
    <SwapModal
      visible={showSwapModal}
      onClose={() => {
        setShowSwapModal(false);
        setSelectedTokenForSwap(null);
      }}
      selectedToken={selectedTokenForSwap}
      tokens={[
        { symbol: 'ALLY', balance: balance, usdValue: balance * 0.5 },
        ...otherTokens
      ]}
    />
  </>
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
    marginBottom: 20,
  },
  allyCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  allyGradient: {
    borderRadius: 16,
    padding: 16,
  },
  allyContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  allyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tokenIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenIconText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: isDarkMode ? '#000' : '#fff',
  },
  allySymbol: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
    color: isDarkMode ? '#000' : '#fff',
  },
  allyLabel: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: isDarkMode ? '#000' : '#fff',
    opacity: 0.7,
  },
  allyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  allyBalance: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: isDarkMode ? '#000' : '#fff',
  },
  refreshIcon: {
    padding: 8,
  },
  dropdownButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  dropdownBlur: {
    borderRadius: 12,
  },
  dropdownGradient: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  dropdownTitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
    color: colors.text,
  },
  tokenListContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: 320,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  tokenListBlur: {
    borderRadius: 16,
  },
  tokenListGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tokenScrollView: {
    maxHeight: 250,
  },
  tokenItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight + '30',
  },
  lastTokenItem: {
    borderBottomWidth: 0,
  },
  tokenLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  smallTokenIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  smallTokenIconText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
    color: colors.text,
  },
  tokenSymbol: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: colors.text,
  },
  tokenUsd: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tokenRight: {
    alignItems: 'flex-end',
  },
  tokenBalance: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
    color: colors.text,
  },
  tokenBalanceLabel: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  totalValueContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface + '50',
  },
  totalValueLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: colors.textSecondary,
  },
  totalValueAmount: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: colors.primary,
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