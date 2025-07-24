import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

const CHOICES: { type: Choice; emoji: string; name: string }[] = [
  { type: 'rock', emoji: '🪨', name: 'Rock' },
  { type: 'paper', emoji: '📄', name: 'Paper' },
  { type: 'scissors', emoji: '✂️', name: 'Scissors' },
];

const { width: screenWidth } = Dimensions.get('window');

export default function RockPaperScissorsV3({
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

  const handleChoicePress = (choice: Choice, index: number) => {
    if (!canMakeChoice) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedChoice(choice);

    Animated.sequence([
      Animated.spring(animatedValues[index], {
        toValue: 0.95,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.spring(animatedValues[index], {
        toValue: 1,
        friction: 4,
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
      {/* Score Display */}
      <LinearGradient
        colors={gradients.surface}
        style={[styles.scoreContainer]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.scoreSection}>
          <Text style={[styles.playerLabel, { 
            color: isPlayer1 ? colors.primary : colors.textSecondary 
          }]}>
            {isPlayer1 ? 'YOU' : 'P1'}
          </Text>
          <Text style={[styles.score, { 
            color: isPlayer1 ? colors.primary : colors.text 
          }]}>
            {p1Score}
          </Text>
        </View>

        <View style={styles.roundInfo}>
          <Text style={[styles.roundLabel, { color: colors.textTertiary }]}>
            ROUND
          </Text>
          <Text style={[styles.roundNumber, { color: colors.text }]}>
            {currentRound}/3
          </Text>
        </View>

        <View style={styles.scoreSection}>
          <Text style={[styles.playerLabel, { 
            color: isPlayer2 ? colors.secondary : colors.textSecondary 
          }]}>
            {isPlayer2 ? 'YOU' : 'P2'}
          </Text>
          <Text style={[styles.score, { 
            color: isPlayer2 ? colors.secondary : colors.text 
          }]}>
            {p2Score}
          </Text>
        </View>
      </LinearGradient>

      {/* Status */}
      {!winner && (
        <LinearGradient
          colors={canMakeChoice ? gradients.primary : gradients.button}
          style={[styles.statusCard, { 
            borderColor: canMakeChoice ? colors.primary + '66' : colors.borderLight,
          }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={[styles.statusText, { 
            color: canMakeChoice ? (isDarkMode ? '#000' : '#fff') : colors.textSecondary 
          }]}>
            {!player2 ? 'Waiting for opponent...' :
             canMakeChoice ? 'Choose your move!' : 
             hasPlayerChosen ? 'Waiting for opponent...' : 
             'Opponent is choosing...'}
          </Text>
        </LinearGradient>
      )}

      {/* Choice Buttons */}
      <View style={styles.choicesContainer}>
        {CHOICES.map((choice, index) => {
          const isSelected = selectedChoice === choice.type;
          const isDisabled = !canMakeChoice || hasPlayerChosen;
          
          return (
            <Animated.View
              key={choice.type}
              style={{
                transform: [{ scale: animatedValues[index] }],
              }}
            >
              <TouchableOpacity
                style={[
                  styles.choiceButton,
                  {
                    backgroundColor: isSelected 
                      ? colors.primary + '20' 
                      : colors.surface + '20',
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                    opacity: isDisabled && !isSelected ? 0.5 : 1,
                  },
                ]}
                onPress={() => handleChoicePress(choice.type, index)}
                disabled={isDisabled}
                activeOpacity={0.8}
              >
                <Text style={styles.choiceEmoji}>{choice.emoji}</Text>
                <Text style={[styles.choiceName, { 
                  color: isSelected ? colors.primary : colors.text,
                  fontFamily: isSelected ? Fonts.bold : Fonts.semiBold,
                }]}>
                  {choice.name}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* Round Result */}
      {currentRoundData.winner && !winner && (
        <View style={[styles.roundResult, { 
          backgroundColor: currentRoundData.winner === walletAddress 
            ? colors.success + '20' 
            : currentRoundData.winner === 'draw'
              ? colors.surface
              : colors.error + '20'
        }]}>
          <View style={styles.roundChoices}>
            <View style={styles.choiceDisplay}>
              <Text style={styles.choiceDisplayEmoji}>
                {CHOICES.find(c => c.type === myCurrentChoice)?.emoji}
              </Text>
              <Text style={[styles.choiceDisplayLabel, { color: colors.textSecondary }]}>
                You
              </Text>
            </View>
            
            <Text style={[styles.vsText, { color: colors.textTertiary }]}>VS</Text>
            
            <View style={styles.choiceDisplay}>
              <Text style={styles.choiceDisplayEmoji}>
                {CHOICES.find(c => c.type === opponentChoice)?.emoji}
              </Text>
              <Text style={[styles.choiceDisplayLabel, { color: colors.textSecondary }]}>
                Opp
              </Text>
            </View>
          </View>
          
          <Text style={[styles.roundResultText, { 
            color: currentRoundData.winner === walletAddress 
              ? colors.success 
              : currentRoundData.winner === 'draw'
                ? colors.text
                : colors.error
          }]}>
            {currentRoundData.winner === 'draw' 
              ? 'Draw!' 
              : currentRoundData.winner === walletAddress 
                ? 'Round Won!' 
                : 'Round Lost'}
          </Text>
        </View>
      )}

      {/* Final Result */}
      {winner && (
        <LinearGradient
          colors={winner === walletAddress 
            ? [colors.primary + '30', colors.primary + '10'] 
            : [colors.error + '30', colors.error + '10']}
          style={[styles.finalResult]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.finalResultEmoji}>
            {winner === walletAddress ? '🏆' : '💔'}
          </Text>
          <Text style={[styles.finalResultText, {
            color: winner === walletAddress ? colors.primary : colors.error
          }]}>
            {winner === walletAddress ? 'You Won!' : 'You Lost'}
          </Text>
          <Text style={[styles.finalResultWager, {
            color: winner === walletAddress ? colors.primary : colors.error
          }]}>
            {winner === walletAddress ? '+' : '-'}{wager} ALLY
          </Text>
        </LinearGradient>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.4)',
  },
  scoreSection: {
    alignItems: 'center',
    minWidth: 80,
  },
  playerLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  score: {
    fontSize: 48,
    fontFamily: Fonts.bold,
    lineHeight: 52,
  },
  roundInfo: {
    alignItems: 'center',
  },
  roundLabel: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.5,
  },
  roundNumber: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
  },
  statusCard: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.4)',
  },
  statusText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  choicesContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  choiceButton: {
    width: 110,
    height: 140,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  choiceEmoji: {
    fontSize: 48,
  },
  choiceName: {
    fontSize: FontSizes.base,
    letterSpacing: 0.3,
  },
  roundResult: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  roundChoices: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  choiceDisplay: {
    alignItems: 'center',
    gap: 4,
  },
  choiceDisplayEmoji: {
    fontSize: 40,
  },
  choiceDisplayLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
  },
  vsText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
  },
  roundResultText: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
  },
  finalResult: {
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 24,
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  finalResultEmoji: {
    fontSize: 40,
  },
  finalResultText: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    letterSpacing: -0.5,
  },
  finalResultWager: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.2,
  },
});