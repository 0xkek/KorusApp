import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import { Fonts, FontSizes } from '../../constants/Fonts';

type CoinSide = 'heads' | 'tails';

interface CoinFlipGameProps {
  gameId: string;
  player1: string;
  player2: string | null;
  wager: number;
  onChoose: (choice: CoinSide) => void;
  player1Choice: CoinSide | null;
  player2Choice: CoinSide | null;
  result: CoinSide | null;
  winner: string | null;
  expiresAt: number;
}

const { width: screenWidth } = Dimensions.get('window');

export default function CoinFlipV2({
  player1,
  player2,
  wager,
  onChoose,
  player1Choice,
  player2Choice,
  result,
  winner,
}: CoinFlipGameProps) {
  const { colors, gradients, isDarkMode } = useTheme();
  const { walletAddress } = useWallet();
  const [selectedSide, setSelectedSide] = useState<CoinSide | null>(null);
  const coinAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;

  const isPlayer1 = walletAddress?.toLowerCase() === player1?.toLowerCase();
  const isPlayer2 = walletAddress?.toLowerCase() === player2?.toLowerCase();
  const canChoose = isPlayer2 && !player2Choice && player2;

  useEffect(() => {
    if (result) {
      // Coin flip animation
      Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.timing(coinAnimation, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          { iterations: 8 }
        ),
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Glow effect for winner
        if (winner) {
          Animated.loop(
            Animated.sequence([
              Animated.timing(glowAnimation, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(glowAnimation, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
              }),
            ])
          ).start();
        }
      });
    }
  }, [result]);

  const handleSideSelect = (side: CoinSide) => {
    if (!canChoose) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSelectedSide(side);
    
    // Animate selection
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1.05,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onChoose(side);
    });
  };

  const rotateY = coinAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '180deg', '360deg'],
  });

  const glowOpacity = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <View style={styles.container}>
      {/* Coin Display */}
      <View style={styles.coinContainer}>
        <Animated.View
          style={[
            styles.coin,
            {
              transform: [
                { scale: scaleAnimation },
                { rotateY: result ? rotateY : '0deg' },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={result === 'heads' ? gradients.primary : gradients.secondary}
            style={styles.coinGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {result && (
              <Animated.View
                style={[
                  styles.coinGlow,
                  {
                    opacity: winner ? glowOpacity : 0,
                    shadowColor: result === 'heads' ? colors.primary : colors.secondary,
                  },
                ]}
              />
            )}
            <Text style={styles.coinEmoji}>
              {result ? (result === 'heads' ? '👑' : '🦅') : '🪙'}
            </Text>
            {result && (
              <Text style={styles.coinResultText}>
                {result.toUpperCase()}
              </Text>
            )}
          </LinearGradient>
        </Animated.View>
      </View>

      {/* Game Status */}
      {!player2 && (
        <View style={[styles.statusCard, { backgroundColor: colors.warning + '20' }]}>
          <Ionicons name="time-outline" size={20} color={colors.warning} />
          <Text style={[styles.statusText, { color: colors.warning }]}>
            Waiting for opponent to join...
          </Text>
        </View>
      )}

      {player2 && !player2Choice && (
        <View style={[styles.statusCard, { 
          backgroundColor: canChoose ? colors.primary + '20' : colors.surface 
        }]}>
          <Text style={[styles.statusText, { 
            color: canChoose ? colors.primary : colors.textSecondary 
          }]}>
            {canChoose ? 'Choose your side!' : 'Opponent is choosing...'}
          </Text>
        </View>
      )}

      {/* Side Selection */}
      {canChoose && !player2Choice && (
        <View style={styles.selectionContainer}>
          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            Player 1 gets the opposite side
          </Text>
          
          <View style={styles.sidesContainer}>
            <TouchableOpacity
              style={[styles.sideButton]}
              onPress={() => handleSideSelect('heads')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={selectedSide === 'heads' ? gradients.primary : [colors.surface, colors.surface]}
                style={[
                  styles.sideButtonGradient,
                  {
                    borderColor: selectedSide === 'heads' ? colors.primary : colors.border,
                    borderWidth: 2,
                  },
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.sideEmoji}>👑</Text>
                <Text style={[styles.sideText, { 
                  color: selectedSide === 'heads' ? '#000' : colors.text 
                }]}>
                  HEADS
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.orContainer}>
              <Text style={[styles.orText, { color: colors.textTertiary }]}>OR</Text>
            </View>

            <TouchableOpacity
              style={[styles.sideButton]}
              onPress={() => handleSideSelect('tails')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={selectedSide === 'tails' ? gradients.secondary : [colors.surface, colors.surface]}
                style={[
                  styles.sideButtonGradient,
                  {
                    borderColor: selectedSide === 'tails' ? colors.secondary : colors.border,
                    borderWidth: 2,
                  },
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.sideEmoji}>🦅</Text>
                <Text style={[styles.sideText, { 
                  color: selectedSide === 'tails' ? '#000' : colors.text 
                }]}>
                  TAILS
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Player Choices Display */}
      {player2Choice && !result && (
        <View style={styles.choicesDisplay}>
          <View style={styles.choiceCard}>
            <Text style={[styles.choiceLabel, { color: colors.textSecondary }]}>
              {isPlayer1 ? 'YOUR SIDE' : 'PLAYER 1'}
            </Text>
            <View style={[styles.choiceBox, { backgroundColor: colors.primary + '20' }]}>
              <Text style={styles.choiceEmoji}>
                {player1Choice === 'heads' ? '👑' : '🦅'}
              </Text>
              <Text style={[styles.choiceText, { color: colors.primary }]}>
                {player1Choice?.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.flipIndicator}>
            <Ionicons name="sync" size={24} color={colors.textTertiary} />
            <Text style={[styles.flippingText, { color: colors.textSecondary }]}>
              Flipping...
            </Text>
          </View>

          <View style={styles.choiceCard}>
            <Text style={[styles.choiceLabel, { color: colors.textSecondary }]}>
              {isPlayer2 ? 'YOUR SIDE' : 'PLAYER 2'}
            </Text>
            <View style={[styles.choiceBox, { backgroundColor: colors.secondary + '20' }]}>
              <Text style={styles.choiceEmoji}>
                {player2Choice === 'heads' ? '👑' : '🦅'}
              </Text>
              <Text style={[styles.choiceText, { color: colors.secondary }]}>
                {player2Choice?.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Result Display */}
      {result && winner && (
        <View style={styles.resultContainer}>
          <LinearGradient
            colors={winner === walletAddress ? gradients.success : gradients.error}
            style={styles.resultGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.resultEmoji}>
              {winner === walletAddress ? '🎉' : '😔'}
            </Text>
            <Text style={styles.resultText}>
              {winner === walletAddress ? 'You Won!' : 'You Lost'}
            </Text>
            <Text style={styles.resultAmount}>
              {winner === walletAddress ? '+' : '-'}{wager} ALLY
            </Text>
            <View style={styles.resultDetails}>
              <Text style={styles.resultDetailText}>
                The coin landed on {result}
              </Text>
            </View>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 24,
  },
  coinContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coin: {
    width: 160,
    height: 160,
    borderRadius: 80,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  coinGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  coinGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 80,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  coinEmoji: {
    fontSize: 80,
  },
  coinResultText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: '#000',
    marginTop: 8,
    letterSpacing: 1,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  statusText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
  },
  selectionContainer: {
    alignItems: 'center',
    gap: 16,
  },
  instructionText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
  },
  sidesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  sideButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  sideButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
  },
  sideEmoji: {
    fontSize: 56,
  },
  sideText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  orContainer: {
    paddingHorizontal: 16,
  },
  orText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
  },
  choicesDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  choiceCard: {
    alignItems: 'center',
    gap: 8,
  },
  choiceLabel: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.5,
  },
  choiceBox: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
    gap: 8,
  },
  choiceEmoji: {
    fontSize: 40,
  },
  choiceText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
  },
  flipIndicator: {
    alignItems: 'center',
    gap: 4,
  },
  flippingText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
  },
  resultContainer: {
    marginTop: 20,
  },
  resultGradient: {
    paddingHorizontal: 48,
    paddingVertical: 32,
    borderRadius: 32,
    alignItems: 'center',
    gap: 8,
  },
  resultEmoji: {
    fontSize: 64,
  },
  resultText: {
    fontSize: FontSizes['3xl'],
    fontFamily: Fonts.bold,
    color: '#fff',
    letterSpacing: -0.5,
  },
  resultAmount: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.semiBold,
    color: '#fff',
  },
  resultDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  resultDetailText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: '#fff',
    opacity: 0.9,
  },
});