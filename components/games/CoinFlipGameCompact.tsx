import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import { Fonts, FontSizes } from '../../constants/Fonts';
import { useDisplayName } from '../../hooks/useSNSDomain';

type CoinSide = 'heads' | 'tails';

interface CoinFlipGameProps {
  gameId: string;
  player1: string;
  player2: string | null;
  player1Username?: string | null;
  player2Username?: string | null;
  wager: number;
  onChoose: (choice: CoinSide) => void;
  player1Choice: CoinSide | null;
  player2Choice: CoinSide | null;
  result: CoinSide | null;
  winner: string | null;
  expiresAt: number;
}

export default function CoinFlipGame({
  gameId,
  player1,
  player2,
  player1Username,
  player2Username,
  wager,
  onChoose,
  player1Choice,
  player2Choice,
  result,
  winner,
  expiresAt
}: CoinFlipGameProps) {
  const { colors, gradients, isDarkMode } = useTheme();
  const { walletAddress } = useWallet();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [selectedChoice, setSelectedChoice] = useState<CoinSide | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const modalAnimation = useRef(new Animated.Value(0)).current;
  
  const isPlayer1 = walletAddress === player1;
  const isPlayer2 = walletAddress === player2;
  const myChoice = isPlayer1 ? player1Choice : isPlayer2 ? player2Choice : null;
  const canChoose = isPlayer2 && !player2Choice;

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = expiresAt - now;
      
      if (remaining <= 0) {
        setTimeLeft('Expired');
        clearInterval(timer);
      } else {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  const handleChoice = (choice: CoinSide) => {
    if (!choice || !canChoose || !player2) return;
    
    setSelectedChoice(choice);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowConfirmation(true);
    
    // Animate modal in
    Animated.spring(modalAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 10
    }).start();
  };

  const confirmChoice = () => {
    if (!selectedChoice) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Animate modal out quickly
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true
    }).start(() => {
      onChoose(selectedChoice);
      setShowConfirmation(false);
      modalAnimation.setValue(0);
    });
  };

  const cancelChoice = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Animate modal out
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start(() => {
      setSelectedChoice(null);
      setShowConfirmation(false);
    });
  };

  const getStatusIcon = () => {
    if (!player2) return '⏳';
    if (winner) return winner === walletAddress ? '🎉' : '😔';
    if (player2Choice && !result) return '🪙';
    if (isPlayer2 && !player2Choice) return '👆';
    return '⏳';
  };

  const getStatusText = () => {
    if (!player2) return 'Waiting for opponent...';
    if (winner) return winner === walletAddress ? `You won! (${result})` : `You lost! (${result})`;
    if (player2Choice && !result) return 'Flipping coin...';
    if (isPlayer2 && !player2Choice) return 'Choose your side!';
    if (isPlayer1 && player2 && !player2Choice) return 'Opponent choosing...';
    if (player1Choice && player2Choice) return `You: ${myChoice}`;
    return 'Ready to play!';
  };

  const getStatusColor = () => {
    if (!player2) return colors.warning;
    if (winner) return winner === walletAddress ? colors.primary : colors.error;
    if (isPlayer2 && !player2Choice) return colors.primary;
    return colors.textSecondary;
  };

  return (
    <View style={styles.container}>
      {/* Compact Header */}
      <View style={styles.header}>
        <View style={styles.statusSection}>
          <Text style={[styles.statusIcon]}>{getStatusIcon()}</Text>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
        
        <View style={styles.infoSection}>
          <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              💰 {wager}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.surface }]}>
            <Ionicons name="timer-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
              {timeLeft}
            </Text>
          </View>
        </View>
      </View>

      {/* Compact Choice Cards */}
      {(!winner && (canChoose || !player2)) && (
        <View style={styles.choicesRow}>
          <TouchableOpacity
            style={[
              styles.compactChoice,
              { 
                borderColor: (canChoose && selectedChoice === 'heads') || myChoice === 'heads' 
                  ? colors.primary 
                  : colors.borderLight,
                opacity: !player2 || !canChoose ? 0.7 : 1
              }
            ]}
            onPress={() => handleChoice('heads')}
            activeOpacity={0.8}
            disabled={!canChoose || !player2}
          >
            <LinearGradient
              colors={(canChoose && selectedChoice === 'heads') || myChoice === 'heads'
                ? gradients.primary 
                : [colors.surface, colors.background]}
              style={styles.choiceGradient}
            >
              <Ionicons name="sunny" size={24} color={myChoice === 'heads' ? '#000' : colors.text} />
              <Text style={[styles.choiceLabel, { 
                color: myChoice === 'heads' ? '#000' : colors.text,
                fontFamily: myChoice === 'heads' ? Fonts.semiBold : Fonts.medium
              }]}>
                Heads
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={[styles.orText, { color: colors.textTertiary }]}>or</Text>

          <TouchableOpacity
            style={[
              styles.compactChoice,
              { 
                borderColor: (canChoose && selectedChoice === 'tails') || myChoice === 'tails' 
                  ? colors.primary 
                  : colors.borderLight,
                opacity: !player2 || !canChoose ? 0.7 : 1
              }
            ]}
            onPress={() => handleChoice('tails')}
            activeOpacity={0.8}
            disabled={!canChoose || !player2}
          >
            <LinearGradient
              colors={(canChoose && selectedChoice === 'tails') || myChoice === 'tails'
                ? gradients.primary 
                : [colors.surface, colors.background]}
              style={styles.choiceGradient}
            >
              <Ionicons name="moon" size={24} color={myChoice === 'tails' ? '#000' : colors.text} />
              <Text style={[styles.choiceLabel, { 
                color: myChoice === 'tails' ? '#000' : colors.text,
                fontFamily: myChoice === 'tails' ? Fonts.semiBold : Fonts.medium
              }]}>
                Tails
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Show choices when made */}
      {player1Choice && player2Choice && !winner && (
        <View style={[styles.choiceDisplay, { backgroundColor: colors.surface }]}>
          <Text style={[styles.choiceInfo, { color: colors.textSecondary }]}>
            You picked: <Text style={{ color: colors.primary, fontFamily: Fonts.semiBold }}>{myChoice}</Text>
          </Text>
          <Text style={[styles.choiceInfo, { color: colors.textSecondary }]}>
            Opponent: <Text style={{ color: colors.secondary, fontFamily: Fonts.semiBold }}>
              {isPlayer1 ? player2Choice : player1Choice}
            </Text>
          </Text>
        </View>
      )}

      {/* Confirmation Modal Overlay */}
      {showConfirmation && selectedChoice && (
        <Animated.View style={[
          styles.confirmationOverlay,
          {
            opacity: modalAnimation,
          }
        ]}>
          <TouchableOpacity 
            style={[styles.confirmationBackdrop, { backgroundColor: colors.background + 'E6' }]} 
            onPress={cancelChoice}
            activeOpacity={1}
          />
          <Animated.View style={[
            styles.confirmationCard, 
            { 
              backgroundColor: colors.surface,
              transform: [{
                scale: modalAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1]
                })
              }]
            }
          ]}>
            <Text style={[styles.confirmationTitle, { color: colors.text }]}>
              Confirm Your Choice
            </Text>
            
            <View style={[styles.selectedDisplay, { backgroundColor: colors.background }]}>
              <Ionicons 
                name={selectedChoice === 'heads' ? 'sunny' : 'moon'} 
                size={32} 
                color={colors.primary} 
              />
              <Text style={[styles.selectedText, { color: colors.primary }]}>
                {selectedChoice.toUpperCase()}
              </Text>
            </View>
            
            <View style={[styles.wagerAlert, { backgroundColor: colors.error + '15' }]}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={[styles.wagerAlertText, { color: colors.error }]}>
                {wager} ALLY will be wagered
              </Text>
            </View>
            
            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
                onPress={cancelChoice}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmChoice}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={gradients.primary}
                  style={styles.confirmButtonGradient}
                >
                  <Text style={styles.confirmButtonText}>
                    Confirm
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  statusIcon: {
    fontSize: 20,
  },
  statusText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    flex: 1,
  },
  infoSection: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
  },
  choicesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  compactChoice: {
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    flex: 1,
    maxWidth: 140,
  },
  choiceGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
  },
  choiceLabel: {
    fontSize: FontSizes.sm,
  },
  orText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
  },
  choiceDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  choiceInfo: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
  },
  confirmationOverlay: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  confirmationBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  confirmationCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    width: '90%',
    maxWidth: 300,
  },
  confirmationTitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
  },
  selectedDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  selectedText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
  },
  wagerAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  wagerAlertText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
  },
  confirmButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  confirmButtonText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: '#000',
  },
});