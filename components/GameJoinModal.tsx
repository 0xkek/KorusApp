import React from 'react';
import { Modal, StyleSheet, Text, View, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { Fonts, FontSizes } from '../constants/Fonts';
import { GameType } from '../types';

interface GameJoinModalProps {
  visible: boolean;
  gameType: GameType | null;
  wager: number;
  onClose: () => void;
  onConfirm: () => void;
  walletBalance: number;
}

export default function GameJoinModal({
  visible,
  gameType,
  wager,
  onClose,
  onConfirm,
  walletBalance
}: GameJoinModalProps) {
  const { colors, isDarkMode, gradients } = useTheme();

  const getGameDetails = () => {
    switch (gameType) {
      case 'tictactoe':
        return {
          name: 'Tic Tac Toe',
          icon: 'grid-outline' as const,
          description: 'Classic 3x3 grid game. First to get 3 in a row wins!'
        };
      case 'rps':
        return {
          name: 'Rock Paper Scissors',
          icon: 'hand-left-outline' as const,
          description: 'Best of 3 rounds. Rock beats scissors, scissors beats paper, paper beats rock.'
        };
      case 'coinflip':
        return {
          name: 'Coin Flip',
          icon: 'logo-bitcoin' as const,
          description: 'Choose heads or tails. Winner takes all!'
        };
      default:
        return {
          name: 'Game',
          icon: 'game-controller-outline' as const,
          description: ''
        };
    }
  };

  const gameDetails = getGameDetails();
  const canAfford = walletBalance >= wager;

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onConfirm();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { shadowColor: colors.shadowColor }]}>
              <LinearGradient
                colors={gradients.surface}
                style={styles.contentGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {/* Header */}
                <View style={styles.header}>
                  <View style={[styles.gameIcon, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name={gameDetails.icon} size={32} color={colors.primary} />
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close-circle" size={24} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>

                {/* Game Info */}
                <Text style={[styles.title, { color: colors.text }]}>
                  Join {gameDetails.name}?
                </Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  {gameDetails.description}
                </Text>

                {/* Wager Info */}
                <View style={[styles.wagerSection, { backgroundColor: colors.surface + '40', borderColor: colors.border }]}>
                  <Text style={[styles.wagerLabel, { color: colors.textTertiary }]}>
                    Wager Amount
                  </Text>
                  <View style={styles.wagerRow}>
                    <Text style={[styles.wagerAmount, { color: colors.primary }]}>
                      {wager} $ALLY
                    </Text>
                    <Text style={[styles.wagerDollar, { color: colors.textTertiary }]}>
                      ≈ ${(wager * 0.01).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Balance Info */}
                <View style={styles.balanceInfo}>
                  <Text style={[styles.balanceLabel, { color: colors.textTertiary }]}>
                    Your Balance:
                  </Text>
                  <Text style={[
                    styles.balanceAmount, 
                    { color: canAfford ? colors.success : colors.error }
                  ]}>
                    {walletBalance.toFixed(2)} $ALLY
                  </Text>
                </View>

                {/* Warning */}
                <View style={[styles.warningBox, { backgroundColor: colors.warning + '10', borderColor: colors.warning + '40' }]}>
                  <Ionicons name="warning-outline" size={16} color={colors.warning} />
                  <Text style={[styles.warningText, { color: colors.warning }]}>
                    This wager is non-refundable. Winner takes all!
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onClose}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={gradients.surface}
                      style={[styles.cancelButtonGradient, { borderColor: colors.borderLight }]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                        Cancel
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      !canAfford && styles.disabledButton
                    ]}
                    onPress={handleConfirm}
                    disabled={!canAfford}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={canAfford ? gradients.primary : gradients.surface}
                      style={styles.confirmButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={[
                        styles.confirmButtonText,
                        { color: canAfford ? (isDarkMode ? '#000' : '#000') : colors.textTertiary }
                      ]}>
                        {canAfford ? 'Join Game' : 'Insufficient Funds'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  contentGradient: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  gameIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: FontSizes['2xl'],
    fontFamily: Fonts.bold,
    marginBottom: 8,
  },
  description: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    lineHeight: 22,
    marginBottom: 24,
  },
  wagerSection: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  wagerLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    marginBottom: 4,
  },
  wagerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  wagerAmount: {
    fontSize: FontSizes['2xl'],
    fontFamily: Fonts.bold,
  },
  wagerDollar: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
  },
  balanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
  },
  balanceAmount: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 16,
  },
  cancelButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
  },
  cancelButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
  },
  confirmButton: {
    flex: 1,
    borderRadius: 16,
  },
  disabledButton: {
    opacity: 0.6,
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