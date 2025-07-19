import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import { Fonts, FontSizes } from '../../constants/Fonts';

type Choice = 'rock' | 'paper' | 'scissors' | null;
type GameStatus = 'waiting' | 'active' | 'revealing' | 'completed';

interface RPSRound {
  player1Choice: Choice;
  player2Choice: Choice;
  winner: string | null;
}

interface RockPaperScissorsGameProps {
  gameId: string;
  player1: string;
  player2: string | null;
  currentPlayer: string;
  isMyTurn: boolean;
  wager: number;
  onMove: (choice: Choice) => void;
  rounds: RPSRound[];
  currentRound: number;
  winner: string | null;
  expiresAt: number;
  gameStatus: GameStatus;
}

const CHOICES = [
  { id: 'rock' as Choice, icon: '✊', name: 'Rock', color: '#FF6B6B' },
  { id: 'paper' as Choice, icon: '✋', name: 'Paper', color: '#4ECDC4' },
  { id: 'scissors' as Choice, icon: '✌️', name: 'Scissors', color: '#FFE66D' }
];

export default function RockPaperScissorsGame({
  gameId,
  player1,
  player2,
  currentPlayer,
  isMyTurn,
  wager,
  onMove,
  rounds,
  currentRound,
  winner,
  expiresAt,
  gameStatus
}: RockPaperScissorsGameProps) {
  const { colors, gradients, isDarkMode } = useTheme();
  const { walletAddress } = useWallet();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const animatedValues = useRef(CHOICES.map(() => new Animated.Value(1))).current;
  
  const isPlayer1 = walletAddress === player1;
  const isPlayer2 = walletAddress === player2;
  const isParticipant = isPlayer1 || isPlayer2;
  
  // Check if current player has already made a choice for this round
  const currentRoundData = rounds[currentRound - 1] || {};
  const myCurrentChoice = isPlayer1 ? currentRoundData.player1Choice : currentRoundData.player2Choice;
  const hasPlayerChosen = !!myCurrentChoice;
  const canMakeChoice = isParticipant && !hasPlayerChosen && gameStatus === 'active' && !winner;
  
  // Use the actual choice from the round data
  const [selectedChoice, setSelectedChoice] = useState<Choice>(myCurrentChoice || null);

  // Update selected choice when round changes
  useEffect(() => {
    setSelectedChoice(myCurrentChoice || null);
  }, [myCurrentChoice]);

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

  const handleChoicePress = (choice: Choice, index: number) => {
    if (!canMakeChoice) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSelectedChoice(choice);

    // Animate selection
    Animated.sequence([
      Animated.timing(animatedValues[index], {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(animatedValues[index], {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(animatedValues[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start(() => {
      onMove(choice);
      // Keep the choice selected to show visual feedback
    });
  };

  const getWinner = (p1Choice: Choice, p2Choice: Choice): string | null => {
    if (!p1Choice || !p2Choice) return null;
    if (p1Choice === p2Choice) return 'draw';
    
    const wins: Record<Choice, Choice> = {
      rock: 'scissors',
      paper: 'rock',
      scissors: 'paper'
    };
    
    return wins[p1Choice] === p2Choice ? player1 : player2;
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
      {/* Compact Header */}
      <View style={styles.header}>
        <View style={styles.playerInfo}>
          <Text style={[styles.score, { color: colors.primary }]}>{p1Score}</Text>
          <Text style={[styles.vs, { color: colors.textSecondary }]}>-</Text>
          <Text style={[styles.score, { color: colors.secondary }]}>{p2Score}</Text>
          <View style={[styles.roundBadge, { backgroundColor: colors.surface }]}>
            <Text style={[styles.roundText, { color: colors.textSecondary }]}>
              R{currentRound}/3
            </Text>
          </View>
        </View>
        
        <View style={styles.gameInfo}>
          <View style={[styles.wagerBadge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.wagerText, { color: colors.primary }]}>
              💰 {wager}
            </Text>
          </View>
          
          <View style={[styles.timerBadge, { backgroundColor: colors.surface }]}>
            <Ionicons name="timer-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.timerText, { color: colors.textSecondary }]}>
              {timeLeft}
            </Text>
          </View>
        </View>
      </View>

      {/* Game Status */}
      {!player2 && (
        <View style={[styles.statusBar, { backgroundColor: colors.warning + '20' }]}>
          <Text style={[styles.statusText, { color: colors.warning }]}>
            Waiting for opponent to join...
          </Text>
        </View>
      )}

      {player2 && !winner && gameStatus === 'active' && (
        <View style={[styles.statusBar, { backgroundColor: canMakeChoice ? colors.primary + '20' : colors.surface }]}>
          <Text style={[styles.statusText, { color: canMakeChoice ? colors.primary : colors.textSecondary }]}>
            {canMakeChoice ? "Make your choice!" : hasPlayerChosen ? "Waiting for opponent..." : "Not your game"}
          </Text>
        </View>
      )}

      {gameStatus === 'revealing' && (
        <View style={[styles.statusBar, { backgroundColor: colors.secondary + '20' }]}>
          <Text style={[styles.statusText, { color: colors.secondary }]}>
            Revealing choices...
          </Text>
        </View>
      )}

      {winner && (
        <LinearGradient
          colors={winner === walletAddress ? gradients.primary : winner === 'draw' ? gradients.surface : ['#FF6B6B', '#FF4444']}
          style={styles.winnerBar}
        >
          <Text style={styles.winnerText}>
            🎉 {winner === walletAddress ? 'You win!' : winner === 'draw' ? 'Draw!' : 'You lose!'} 🎉
          </Text>
        </LinearGradient>
      )}

      {/* Choice Selection */}
      <View style={styles.choicesContainer}>
        {CHOICES.map((choice, index) => (
          <TouchableOpacity
            key={choice.id}
            onPress={() => handleChoicePress(choice.id, index)}
            disabled={!canMakeChoice}
            activeOpacity={0.8}
          >
            <Animated.View style={{ transform: [{ scale: animatedValues[index] }] }}>
              <LinearGradient
                colors={
                  myCurrentChoice === choice.id 
                    ? gradients.primary
                    : selectedChoice === choice.id && canMakeChoice
                    ? [colors.primary + '40', colors.primary + '20']
                    : gradients.surface
                }
                style={[
                  styles.choiceButton,
                  { 
                    borderColor: myCurrentChoice === choice.id ? colors.primary : 
                                selectedChoice === choice.id && canMakeChoice ? colors.primary + '80' : 
                                colors.borderLight,
                    borderWidth: myCurrentChoice === choice.id ? 3 : 
                                selectedChoice === choice.id && canMakeChoice ? 2 : 1,
                    opacity: !canMakeChoice && !hasPlayerChosen ? 0.5 : 1
                  }
                ]}
              >
                <Text style={styles.choiceEmoji}>{choice.icon}</Text>
                <Text style={[styles.choiceName, { color: colors.text }]}>
                  {choice.name}
                </Text>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Round History */}
      {rounds.length > 0 && (
        <View style={styles.historyContainer}>
          <Text style={[styles.historyTitle, { color: colors.textSecondary }]}>
            Round History
          </Text>
          {rounds.map((round, index) => (
            <View key={index} style={[styles.roundResult, { backgroundColor: colors.surface }]}>
              <Text style={[styles.roundNumber, { color: colors.textTertiary }]}>
                Round {index + 1}
              </Text>
              <View style={styles.roundChoices}>
                <Text style={styles.choiceIcon}>
                  {CHOICES.find(c => c.id === round.player1Choice)?.icon || '?'}
                </Text>
                <Text style={[styles.vsSmall, { color: colors.textTertiary }]}>vs</Text>
                <Text style={styles.choiceIcon}>
                  {CHOICES.find(c => c.id === round.player2Choice)?.icon || '?'}
                </Text>
              </View>
              <Text style={[
                styles.roundWinner,
                { 
                  color: round.winner === walletAddress ? colors.primary : 
                         round.winner === 'draw' ? colors.textSecondary :
                         colors.error
                }
              ]}>
                {round.winner === walletAddress ? 'Won!' : 
                 round.winner === 'draw' ? 'Draw' : 
                 'Lost'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    marginBottom: 8,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 6,
  },
  playerName: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
  },
  score: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    marginHorizontal: 2,
  },
  vs: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    marginHorizontal: 6,
  },
  gameInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  roundBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roundText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
  },
  wagerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  wagerText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timerText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
  },
  statusBar: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
  },
  winnerBar: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  winnerText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: '#000',
  },
  choicesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  choiceButton: {
    width: 75,
    height: 75,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  choiceEmoji: {
    fontSize: 28,
    marginBottom: 2,
  },
  choiceName: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
  },
  historyContainer: {
    marginTop: 8,
  },
  historyTitle: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    marginBottom: 4,
  },
  roundResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 6,
    marginBottom: 3,
  },
  roundNumber: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
  },
  roundChoices: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  choiceIcon: {
    fontSize: 20,
  },
  vsSmall: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
  },
  roundWinner: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
  },
});