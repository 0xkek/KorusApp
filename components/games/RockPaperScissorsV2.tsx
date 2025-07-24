import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import { Fonts, FontSizes } from '../../constants/Fonts';

type Choice = 'rock' | 'paper' | 'scissors';

interface RoundData {
  player1Choice?: Choice;
  player2Choice?: Choice;
  winner?: string | 'draw';
}

interface RockPaperScissorsGameProps {
  gameId: string;
  player1: string;
  player2: string | null;
  currentPlayer: string;
  isMyTurn: boolean;
  wager: number;
  onMove: (choice: Choice) => void;
  rounds: RoundData[];
  currentRound: number;
  winner: string | null;
  expiresAt: number;
  gameStatus: 'waiting' | 'active' | 'completed' | 'expired';
}

const CHOICES: { type: Choice; icon: string; beats: Choice }[] = [
  { type: 'rock', icon: '🪨', beats: 'scissors' },
  { type: 'paper', icon: '📄', beats: 'rock' },
  { type: 'scissors', icon: '✂️', beats: 'paper' },
];

const { width: screenWidth } = Dimensions.get('window');

export default function RockPaperScissorsV2({
  player1,
  player2,
  isMyTurn,
  wager,
  onMove,
  rounds,
  currentRound,
  winner,
  gameStatus,
}: RockPaperScissorsGameProps) {
  const { colors, gradients, isDarkMode } = useTheme();
  const { walletAddress } = useWallet();
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const animatedValues = useRef(CHOICES.map(() => new Animated.Value(1))).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  const isPlayer1 = walletAddress?.toLowerCase() === player1?.toLowerCase();
  const isPlayer2 = walletAddress?.toLowerCase() === player2?.toLowerCase();
  const isParticipant = isPlayer1 || isPlayer2;

  const currentRoundData = rounds[currentRound - 1] || {};
  const myCurrentChoice = isPlayer1 ? currentRoundData.player1Choice : currentRoundData.player2Choice;
  const opponentChoice = isPlayer1 ? currentRoundData.player2Choice : currentRoundData.player1Choice;
  const hasPlayerChosen = !!myCurrentChoice;
  const canMakeChoice = isParticipant && !hasPlayerChosen && gameStatus === 'active' && !winner;

  useEffect(() => {
    setSelectedChoice(myCurrentChoice || null);
  }, [myCurrentChoice]);

  useEffect(() => {
    if (canMakeChoice) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [canMakeChoice]);

  const handleChoicePress = (choice: Choice, index: number) => {
    if (!canMakeChoice) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSelectedChoice(choice);

    Animated.sequence([
      Animated.timing(animatedValues[index], {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValues[index], {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValues[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onMove(choice);
    });
  };

  const getScores = () => {
    let p1Score = 0;
    let p2Score = 0;
    
    rounds.forEach(round => {
      if (round.winner === player1) p1Score++;
      else if (round.winner === player2) p2Score++;
    });
    
    return { p1Score, p2Score };
  };

  const { p1Score, p2Score } = getScores();

  return (
    <View style={styles.container}>
      {/* Round Progress */}
      <View style={styles.roundProgress}>
        {[1, 2, 3].map((round) => (
          <View key={round} style={styles.roundIndicator}>
            <View
              style={[
                styles.roundDot,
                {
                  backgroundColor:
                    round < currentRound
                      ? colors.success
                      : round === currentRound
                      ? colors.primary
                      : colors.border,
                  width: round === currentRound ? 20 : 16,
                  height: round === currentRound ? 20 : 16,
                },
              ]}
            />
            <Text
              style={[
                styles.roundText,
                {
                  color:
                    round <= currentRound ? colors.text : colors.textTertiary,
                  fontFamily:
                    round === currentRound ? Fonts.bold : Fonts.medium,
                },
              ]}
            >
              Round {round}
            </Text>
          </View>
        ))}
      </View>

      {/* Score Display */}
      <View style={styles.scoreContainer}>
        <View style={styles.scoreCard}>
          <LinearGradient
            colors={isPlayer1 ? gradients.primary : [colors.surface, colors.surface]}
            style={styles.scoreGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.scoreNumber, { color: isPlayer1 ? '#000' : colors.text }]}>
              {p1Score}
            </Text>
            <Text style={[styles.scoreLabel, { color: isPlayer1 ? '#000' : colors.textSecondary }]}>
              {isPlayer1 ? 'YOU' : 'P1'}
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.vsBox}>
          <Text style={[styles.vsText, { color: colors.textTertiary }]}>VS</Text>
          <Text style={[styles.roundLabel, { color: colors.textSecondary }]}>
            Best of 3
          </Text>
        </View>

        <View style={styles.scoreCard}>
          <LinearGradient
            colors={isPlayer2 ? gradients.secondary : [colors.surface, colors.surface]}
            style={styles.scoreGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.scoreNumber, { color: isPlayer2 ? '#000' : colors.text }]}>
              {p2Score}
            </Text>
            <Text style={[styles.scoreLabel, { color: isPlayer2 ? '#000' : colors.textSecondary }]}>
              {isPlayer2 ? 'YOU' : 'P2'}
            </Text>
          </LinearGradient>
        </View>
      </View>

      {/* Game Status */}
      {!player2 && (
        <View style={[styles.statusCard, { backgroundColor: colors.warning + '20' }]}>
          <Text style={[styles.statusText, { color: colors.warning }]}>
            Waiting for opponent to join...
          </Text>
        </View>
      )}

      {player2 && !winner && gameStatus === 'active' && (
        <View style={[styles.statusCard, { 
          backgroundColor: canMakeChoice ? colors.primary + '20' : colors.surface 
        }]}>
          <Text style={[styles.statusText, { 
            color: canMakeChoice ? colors.primary : colors.textSecondary 
          }]}>
            {canMakeChoice ? "Make your choice!" : 
             hasPlayerChosen ? "Waiting for opponent..." : 
             "Opponent's turn"}
          </Text>
        </View>
      )}

      {/* Choice Selection */}
      <View style={styles.choicesContainer}>
        {CHOICES.map((choice, index) => {
          const isSelected = selectedChoice === choice.type;
          const isDisabled = !canMakeChoice || hasPlayerChosen;
          
          return (
            <Animated.View
              key={choice.type}
              style={{
                transform: [
                  { scale: canMakeChoice && !hasPlayerChosen ? pulseAnimation : animatedValues[index] }
                ],
              }}
            >
              <TouchableOpacity
                style={[
                  styles.choiceButton,
                  {
                    backgroundColor: isSelected 
                      ? colors.primary + '20' 
                      : colors.surface + '60',
                    borderColor: isSelected ? colors.primary : 'transparent',
                    borderWidth: isSelected ? 3 : 0,
                    opacity: isDisabled && !isSelected ? 0.5 : 1,
                  },
                ]}
                onPress={() => handleChoicePress(choice.type, index)}
                disabled={isDisabled}
                activeOpacity={0.8}
              >
                <Text style={styles.choiceEmoji}>{choice.icon}</Text>
                <Text style={[styles.choiceText, { 
                  color: isSelected ? colors.primary : colors.text 
                }]}>
                  {choice.type.toUpperCase()}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* Current Round Result */}
      {currentRoundData.winner && (
        <View style={styles.roundResultContainer}>
          <LinearGradient
            colors={
              currentRoundData.winner === 'draw'
                ? [colors.textSecondary + '20', colors.textSecondary + '10']
                : currentRoundData.winner === walletAddress
                ? gradients.success
                : gradients.error
            }
            style={styles.roundResultGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.roundChoices}>
              <View style={styles.roundChoiceBox}>
                <Text style={styles.roundChoiceEmoji}>
                  {CHOICES.find(c => c.type === myCurrentChoice)?.icon}
                </Text>
                <Text style={[styles.roundChoiceLabel, { color: '#fff' }]}>YOU</Text>
              </View>
              <Text style={[styles.roundVs, { color: '#fff' }]}>VS</Text>
              <View style={styles.roundChoiceBox}>
                <Text style={styles.roundChoiceEmoji}>
                  {CHOICES.find(c => c.type === opponentChoice)?.icon}
                </Text>
                <Text style={[styles.roundChoiceLabel, { color: '#fff' }]}>OPP</Text>
              </View>
            </View>
            <Text style={[styles.roundResultText, { color: '#fff' }]}>
              {currentRoundData.winner === 'draw'
                ? 'Draw!'
                : currentRoundData.winner === walletAddress
                ? 'You won this round!'
                : 'You lost this round'}
            </Text>
          </LinearGradient>
        </View>
      )}

      {/* Final Result */}
      {winner && (
        <View style={styles.finalResultContainer}>
          <LinearGradient
            colors={winner === walletAddress ? gradients.success : gradients.error}
            style={styles.finalResultGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.finalResultText}>
              {winner === walletAddress ? '🎉 Victory!' : 'Defeated'}
            </Text>
            <Text style={styles.finalResultAmount}>
              {winner === walletAddress ? '+' : '-'}{wager} ALLY
            </Text>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 48,
    paddingVertical: 40,
    minHeight: 600,
    width: '100%',
  },
  roundProgress: {
    flexDirection: 'row',
    gap: 60,
    marginBottom: 32,
    paddingVertical: 20,
  },
  roundIndicator: {
    alignItems: 'center',
    gap: 12,
  },
  roundDot: {
    borderRadius: 12,
  },
  roundText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
    marginBottom: 48,
    paddingVertical: 16,
  },
  scoreCard: {
    borderRadius: 36,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  scoreGradient: {
    paddingHorizontal: 48,
    paddingVertical: 36,
    alignItems: 'center',
    minWidth: 140,
  },
  scoreNumber: {
    fontSize: 80,
    fontFamily: Fonts.bold,
    lineHeight: 84,
  },
  scoreLabel: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    letterSpacing: 1.5,
    marginTop: 8,
  },
  vsBox: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  vsText: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    letterSpacing: 3,
  },
  roundLabel: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  statusCard: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    marginBottom: 8,
  },
  statusText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  choicesContainer: {
    flexDirection: 'row',
    gap: 28,
    marginVertical: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  choiceButton: {
    width: 180,
    height: 200,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  choiceEmoji: {
    fontSize: 80,
  },
  choiceText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    letterSpacing: 1.5,
  },
  roundResultContainer: {
    marginTop: 20,
    width: '100%',
  },
  roundResultGradient: {
    paddingHorizontal: 40,
    paddingVertical: 28,
    borderRadius: 32,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  roundChoices: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 16,
  },
  roundChoiceBox: {
    alignItems: 'center',
    gap: 8,
  },
  roundChoiceEmoji: {
    fontSize: 48,
  },
  roundChoiceLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  roundVs: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },
  roundResultText: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
  },
  finalResultContainer: {
    marginTop: 24,
    width: '100%',
  },
  finalResultGradient: {
    paddingHorizontal: 56,
    paddingVertical: 32,
    borderRadius: 40,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  finalResultText: {
    fontSize: 42,
    fontFamily: Fonts.bold,
    color: '#fff',
    letterSpacing: -0.5,
  },
  finalResultAmount: {
    fontSize: FontSizes['2xl'],
    fontFamily: Fonts.bold,
    color: '#fff',
    marginTop: 8,
    letterSpacing: 0.5,
  },
});