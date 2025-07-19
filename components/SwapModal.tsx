import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useState, useEffect, useCallback } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, TextInput, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Fonts, FontSizes } from '../constants/Fonts';
import { Ionicons } from '@expo/vector-icons';

interface Token {
  symbol: string;
  balance: number;
  usdValue?: number;
}

interface SwapModalProps {
  visible: boolean;
  onClose: () => void;
  selectedToken: Token | null;
  tokens: Token[];
}

export default function SwapModal({ visible, onClose, selectedToken, tokens }: SwapModalProps) {
  const { colors, isDarkMode, gradients } = useTheme();
  const [fromToken, setFromToken] = useState<Token | null>(selectedToken);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [showFromTokens, setShowFromTokens] = useState(false);
  const [showToTokens, setShowToTokens] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [slippage, setSlippage] = useState('0.5'); // 0.5% default slippage

  useEffect(() => {
    setFromToken(selectedToken);
    // Set default "to" token (first token that's not the selected one)
    if (selectedToken && tokens.length > 1) {
      const defaultTo = tokens.find(t => t.symbol !== selectedToken.symbol);
      setToToken(defaultTo || null);
    }
  }, [selectedToken, tokens]);

  // Mock exchange rate calculation
  const calculateExchangeRate = useCallback(() => {
    if (!fromToken || !toToken || !fromAmount || fromAmount === '0') return;
    
    // Mock exchange rates based on USD values
    const fromUsd = (fromToken.usdValue || 1) * parseFloat(fromAmount);
    const toUsd = toToken.usdValue || 1;
    const calculatedAmount = (fromUsd / toUsd).toFixed(6);
    setToAmount(calculatedAmount);
  }, [fromToken, toToken, fromAmount]);

  useEffect(() => {
    calculateExchangeRate();
  }, [calculateExchangeRate]);

  const handleSwap = async () => {
    if (!fromToken || !toToken || !fromAmount || parseFloat(fromAmount) === 0) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsSwapping(true);
    
    // Simulate swap transaction
    setTimeout(() => {
      setIsSwapping(false);
      onClose();
      // In production, this would update actual balances
    }, 2000);
  };

  const switchTokens = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const selectFromToken = (token: Token) => {
    setFromToken(token);
    setShowFromTokens(false);
    if (token.symbol === toToken?.symbol) {
      setToToken(tokens.find(t => t.symbol !== token.symbol) || null);
    }
  };

  const selectToToken = (token: Token) => {
    setToToken(token);
    setShowToTokens(false);
    if (token.symbol === fromToken?.symbol) {
      setFromToken(tokens.find(t => t.symbol !== token.symbol) || null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.modalBackground }]}>
        <View style={styles.modalContainer}>
          <BlurView intensity={60} style={styles.modalBlur}>
            <LinearGradient
              colors={gradients.surface}
              style={styles.modalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Swap Tokens</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* From Token */}
              <View style={styles.swapSection}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>From</Text>
                <View style={[styles.tokenInputContainer, { backgroundColor: colors.surface + '50', borderColor: colors.borderLight }]}>
                  <TouchableOpacity
                    style={styles.tokenSelector}
                    onPress={() => setShowFromTokens(!showFromTokens)}
                  >
                    <View style={styles.tokenInfo}>
                      <View style={[styles.tokenIcon, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.tokenIconText, { color: colors.primary }]}>
                          {fromToken?.symbol.charAt(0) || '?'}
                        </Text>
                      </View>
                      <Text style={[styles.tokenSymbol, { color: colors.text }]}>
                        {fromToken?.symbol || 'Select'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                  
                  <TextInput
                    style={[styles.amountInput, { color: colors.text }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                    value={fromAmount}
                    onChangeText={setFromAmount}
                    keyboardType="numeric"
                  />
                  
                  <Text style={[styles.balance, { color: colors.textSecondary }]}>
                    Balance: {fromToken?.balance || 0}
                  </Text>
                </View>

                {/* From Token Dropdown */}
                {showFromTokens && (
                  <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                    {tokens.map(token => (
                      <TouchableOpacity
                        key={token.symbol}
                        style={styles.dropdownItem}
                        onPress={() => selectFromToken(token)}
                      >
                        <Text style={[styles.dropdownText, { color: colors.text }]}>{token.symbol}</Text>
                        <Text style={[styles.dropdownBalance, { color: colors.textSecondary }]}>
                          {token.balance}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Switch Button */}
              <TouchableOpacity style={styles.switchButton} onPress={switchTokens}>
                <LinearGradient
                  colors={gradients.primary}
                  style={styles.switchGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="swap-vertical" size={24} color={isDarkMode ? '#000' : '#fff'} />
                </LinearGradient>
              </TouchableOpacity>

              {/* To Token */}
              <View style={styles.swapSection}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>To</Text>
                <View style={[styles.tokenInputContainer, { backgroundColor: colors.surface + '50', borderColor: colors.borderLight }]}>
                  <TouchableOpacity
                    style={styles.tokenSelector}
                    onPress={() => setShowToTokens(!showToTokens)}
                  >
                    <View style={styles.tokenInfo}>
                      <View style={[styles.tokenIcon, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.tokenIconText, { color: colors.primary }]}>
                          {toToken?.symbol.charAt(0) || '?'}
                        </Text>
                      </View>
                      <Text style={[styles.tokenSymbol, { color: colors.text }]}>
                        {toToken?.symbol || 'Select'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                  
                  <TextInput
                    style={[styles.amountInput, { color: colors.text }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                    value={toAmount}
                    editable={false}
                  />
                  
                  <Text style={[styles.balance, { color: colors.textSecondary }]}>
                    Balance: {toToken?.balance || 0}
                  </Text>
                </View>

                {/* To Token Dropdown */}
                {showToTokens && (
                  <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                    {tokens.map(token => (
                      <TouchableOpacity
                        key={token.symbol}
                        style={styles.dropdownItem}
                        onPress={() => selectToToken(token)}
                      >
                        <Text style={[styles.dropdownText, { color: colors.text }]}>{token.symbol}</Text>
                        <Text style={[styles.dropdownBalance, { color: colors.textSecondary }]}>
                          {token.balance}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Swap Details */}
              <View style={[styles.swapDetails, { backgroundColor: colors.surface + '30' }]}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Rate</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    1 {fromToken?.symbol} = {toAmount && fromAmount ? (parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(4) : '0'} {toToken?.symbol}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Slippage</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{slippage}%</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Network Fee</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>~0.00025 SOL</Text>
                </View>
              </View>

              {/* Swap Button */}
              <TouchableOpacity
                style={[styles.swapButton, { opacity: fromAmount && parseFloat(fromAmount) > 0 ? 1 : 0.5 }]}
                onPress={handleSwap}
                disabled={!fromAmount || parseFloat(fromAmount) === 0 || isSwapping}
              >
                <LinearGradient
                  colors={gradients.primary}
                  style={styles.swapButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {isSwapping ? (
                    <ActivityIndicator color={isDarkMode ? '#000' : '#fff'} />
                  ) : (
                    <Text style={[styles.swapButtonText, { color: isDarkMode ? '#000' : '#fff' }]}>
                      Swap {fromToken?.symbol} for {toToken?.symbol}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Info Text */}
              <Text style={[styles.infoText, { color: colors.textTertiary }]}>
                Powered by Jupiter Aggregator • Best rates across Solana
              </Text>
            </LinearGradient>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalBlur: {
    flex: 1,
  },
  modalGradient: {
    flex: 1,
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
  },
  closeButton: {
    padding: 4,
  },
  swapSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    marginBottom: 8,
  },
  tokenInputContainer: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  tokenSelector: {
    marginBottom: 12,
  },
  tokenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tokenIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenIconText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
  },
  tokenSymbol: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
    flex: 1,
  },
  amountInput: {
    fontSize: FontSizes['2xl'],
    fontFamily: Fonts.bold,
    marginBottom: 8,
  },
  balance: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
  },
  dropdown: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 150,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  dropdownText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
  },
  dropdownBalance: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
  },
  switchButton: {
    alignSelf: 'center',
    marginVertical: -10,
    zIndex: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  switchGradient: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapDetails: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
  },
  detailValue: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
  },
  swapButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  swapButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapButtonText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
  },
  infoText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },
});