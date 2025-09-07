import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import { Fonts, FontSizes } from '../../constants/Fonts';
import { useDisplayName } from '../../hooks/useSNSDomain';

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
  player1Username?: string | null;
  player2Username?: string | null;
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
  player1Username,
  player2Username,
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
  const safeRounds = rounds || [];
  const currentRoundData = safeRounds[currentRound - 1] || {};
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
    // Check if expiresAt is valid
    if (!expiresAt || isNaN(expiresAt)) {
      setTimeLeft('--:--');
      return;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = expiresAt - now;
      
      if (remaining <= 0) {
        setTimeLeft('Expired');
        clearInterval(timer);
      } else {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        // Ensure we don't show NaN
        if (!isNaN(minutes) && !isNaN(seconds)) {
          setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        } else {
          setTimeLeft('--:--');
        }
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
    
    safeRounds.forEach(round => {
      if (round.winner === player1) p1Score++;
      else if (round.winner === player2) p2Score++;
    });
    
    return { p1Score, p2Score };
  };

  const { p1Score, p2Score } = getScores();

  return (
    <View style={styles.container}>
      {/* Game Content */}
      <View style={styles.topContent}>
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
      <View style={styles.choicesWrapper}>
        <View style={styles.topChoicesRow}>
          {CHOICES.slice(0, 2).map((choice, index) => (
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
                                  colors.border,
                      borderWidth: myCurrentChoice === choice.id ? 4 : 
                                  selectedChoice === choice.id && canMakeChoice ? 3 : 2,
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
        <View style={styles.bottomChoiceRow}>
          {CHOICES.slice(2, 3).map((choice, index) => (
            <TouchableOpacity
              key={choice.id}
              onPress={() => handleChoicePress(choice.id, 2)}
              disabled={!canMakeChoice}
              activeOpacity={0.8}
            >
              <Animated.View style={{ transform: [{ scale: animatedValues[2] }] }}>
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
                                  colors.border,
                      borderWidth: myCurrentChoice === choice.id ? 4 : 
                                  selectedChoice === choice.id && canMakeChoice ? 3 : 2,
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
      </View>
      </View>

      {/* Bottom Content */}
      <View style={styles.bottomContent}>
        {/* Round History */}
        {safeRounds.length > 0 && (
        <View style={styles.historyContainer}>
          <Text style={[styles.historyTitle, { color: colors.textSecondary }]}>
            Round History
          </Text>
          {safeRounds.map((round, index) => (
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
    justifyContent: 'space-between',
  },
  topContent: {
    flex: 1,
  },
  bottomContent: {
    paddingBottom: 20,
  },
  header: {
    marginBottom: 20,
    paddingVertical: 10,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  playerName: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
  },
  score: {
    fontSize: 48,
    fontFamily: Fonts.bold,
    marginHorizontal: 8,
    lineHeight: 50,
  },
  vs: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    marginHorizontal: 12,
  },
  gameInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  roundBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  roundText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  wagerBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  wagerText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  timerText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
  },
  statusBar: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  statusText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.5,
  },
  winnerBar: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  winnerText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 0.5,
  },
  choicesWrapper: {
    marginBottom: 20,
    alignItems: 'center',
  },
  topChoicesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 15,
  },
  bottomChoiceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  choiceButton: {
    width: 100,
    height: 100,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  choiceEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  choiceName: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
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