import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated, Dimensions } from 'react-native';
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

export default function CoinFlipV3({
  player1,
  player2,
  wager,
  onChoose,
  player1Choice,
  player2Choice,
  result,
  winner,
}: CoinFlipGameProps) {
  const { colors } = useTheme();
  const { walletAddress } = useWallet();
  const [selectedSide, setSelectedSide] = useState<CoinSide | null>(null);
  const coinAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  const isPlayer1 = walletAddress?.toLowerCase() === player1?.toLowerCase();
  const isPlayer2 = walletAddress?.toLowerCase() === player2?.toLowerCase();
  const isParticipant = isPlayer1 || isPlayer2;
  const canChoose = isPlayer2 && !player2Choice && player2;
  const myChoice = isPlayer1 ? player1Choice : player2Choice;

  useEffect(() => {
    if (result) {
      // Simple coin flip animation
      Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(coinAnimation, {
          toValue: 8,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [result]);

  const handleSideSelect = (side: CoinSide) => {
    if (!canChoose) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedSide(side);
    onChoose(side);
  };

  const rotateY = coinAnimation.interpolate({
    inputRange: [0, 8],
    outputRange: ['0deg', '2880deg'],
  });

  const renderWaitingState = () => (
    <View style={[styles.statusContainer, { backgroundColor: colors.surface + '60' }]}>
      <Text style={[styles.statusText, { color: colors.textSecondary }]}>
        {!player2 ? 'Waiting for opponent...' : 'Opponent is choosing...'}
      </Text>
    </View>
  );

  const renderChoiceState = () => (
    <>
      <View style={[styles.statusContainer, { backgroundColor: colors.primary + '15' }]}>
        <Text style={[styles.statusText, { color: colors.primary }]}>
          Choose heads or tails!
        </Text>
      </View>

      <View style={styles.choicesContainer}>
        <TouchableOpacity
          style={[
            styles.choiceButton,
            {
              backgroundColor: selectedSide === 'heads' 
                ? colors.primary + '20' 
                : colors.surface + '80',
              borderWidth: selectedSide === 'heads' ? 3 : 0,
              borderColor: colors.primary,
            },
          ]}
          onPress={() => handleSideSelect('heads')}
          activeOpacity={0.8}
        >
          <Text style={styles.choiceEmoji}>👑</Text>
          <Text style={[styles.choiceText, { 
            color: selectedSide === 'heads' ? colors.primary : colors.text,
            fontFamily: selectedSide === 'heads' ? Fonts.bold : Fonts.semiBold,
          }]}>
            Heads
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.choiceButton,
            {
              backgroundColor: selectedSide === 'tails' 
                ? colors.secondary + '20' 
                : colors.surface + '80',
              borderWidth: selectedSide === 'tails' ? 3 : 0,
              borderColor: colors.secondary,
            },
          ]}
          onPress={() => handleSideSelect('tails')}
          activeOpacity={0.8}
        >
          <Text style={styles.choiceEmoji}>🦅</Text>
          <Text style={[styles.choiceText, { 
            color: selectedSide === 'tails' ? colors.secondary : colors.text,
            fontFamily: selectedSide === 'tails' ? Fonts.bold : Fonts.semiBold,
          }]}>
            Tails
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.infoText, { color: colors.textTertiary }]}>
        Player 1 gets the opposite side
      </Text>
    </>
  );

  const renderFlippingState = () => (
    <>
      <View style={styles.playerChoices}>
        <View style={styles.playerChoice}>
          <Text style={[styles.playerLabel, { 
            color: isPlayer1 ? colors.primary : colors.textSecondary 
          }]}>
            {isPlayer1 ? 'YOU' : 'P1'}
          </Text>
          <View style={[styles.choiceDisplay, { backgroundColor: colors.primary + '15' }]}>
            <Text style={styles.choiceDisplayEmoji}>
              {player1Choice === 'heads' ? '👑' : '🦅'}
            </Text>
            <Text style={[styles.choiceDisplayText, { color: colors.primary }]}>
              {player1Choice?.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={[styles.vsText, { color: colors.textTertiary }]}>VS</Text>

        <View style={styles.playerChoice}>
          <Text style={[styles.playerLabel, { 
            color: isPlayer2 ? colors.secondary : colors.textSecondary 
          }]}>
            {isPlayer2 ? 'YOU' : 'P2'}
          </Text>
          <View style={[styles.choiceDisplay, { backgroundColor: colors.secondary + '15' }]}>
            <Text style={styles.choiceDisplayEmoji}>
              {player2Choice === 'heads' ? '👑' : '🦅'}
            </Text>
            <Text style={[styles.choiceDisplayText, { color: colors.secondary }]}>
              {player2Choice?.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.coinContainer, { height: 180 }]}>
        <Animated.View
          style={[
            styles.coin,
            {
              backgroundColor: colors.surface,
              transform: [
                { scale: scaleAnimation },
                { rotateY: result ? rotateY : '0deg' },
              ],
            },
          ]}
        >
          <Text style={styles.coinEmoji}>🪙</Text>
        </Animated.View>
        {!result && (
          <Text style={[styles.flippingText, { color: colors.textSecondary }]}>
            Flipping...
          </Text>
        )}
      </View>
    </>
  );

  const renderResult = () => (
    <>
      {renderFlippingState()}
      
      <View style={[styles.resultContainer, {
        backgroundColor: winner === walletAddress 
          ? colors.success + '20' 
          : colors.error + '20'
      }]}>
        <Text style={styles.resultEmoji}>
          {winner === walletAddress ? '🏆' : '💔'}
        </Text>
        <Text style={[styles.resultText, {
          color: winner === walletAddress ? colors.success : colors.error
        }]}>
          {winner === walletAddress ? 'You Won!' : 'You Lost'}
        </Text>
        <Text style={[styles.resultWager, {
          color: winner === walletAddress ? colors.success : colors.error
        }]}>
          {winner === walletAddress ? '+' : '-'}{wager} ALLY
        </Text>
        <Text style={[styles.resultDetail, { color: colors.textSecondary }]}>
          Coin landed on {result}
        </Text>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      {!player2 && renderWaitingState()}
      {player2 && !player2Choice && canChoose && renderChoiceState()}
      {player2 && !player2Choice && !canChoose && renderWaitingState()}
      {player2Choice && !result && renderFlippingState()}
      {result && winner && renderResult()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 24,
  },
  statusContainer: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
  },
  statusText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
    textAlign: 'center',
  },
  choicesContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  choiceButton: {
    width: 140,
    height: 160,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  choiceEmoji: {
    fontSize: 64,
  },
  choiceText: {
    fontSize: FontSizes.lg,
    letterSpacing: 0.3,
  },
  infoText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
  },
  playerChoices: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  playerChoice: {
    alignItems: 'center',
    gap: 8,
  },
  playerLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  choiceDisplay: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    gap: 4,
  },
  choiceDisplayEmoji: {
    fontSize: 40,
  },
  choiceDisplayText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
  },
  vsText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
  },
  coinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coin: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  coinEmoji: {
    fontSize: 64,
  },
  flippingText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
    marginTop: 16,
  },
  resultContainer: {
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
    letterSpacing: -0.5,
  },
  resultWager: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.semiBold,
  },
  resultDetail: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    marginTop: 8,
  },
});