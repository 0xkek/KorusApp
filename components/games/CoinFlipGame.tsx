import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
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

export default function CoinFlipGame({
  gameId,
  player1,
  player2,
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
  const [isFlipping, setIsFlipping] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<CoinSide | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const modalAnimation = useRef(new Animated.Value(0)).current;
  
  const isPlayer1 = walletAddress === player1;
  const isPlayer2 = walletAddress === player2;
  const myChoice = isPlayer1 ? player1Choice : isPlayer2 ? player2Choice : null;
  const canChoose = isPlayer2 && !player2Choice; // Only player 2 (joiner) can choose

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

  // Animate coin flip when result is revealed
  useEffect(() => {
    if (result && player1Choice && player2Choice && !isFlipping) {
      setIsFlipping(true);
      
      // Play haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      // Animate the coin flip
      Animated.parallel([
        // Flip animation
        Animated.timing(flipAnimation, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true
        }),
        // Scale animation for dramatic effect
        Animated.sequence([
          Animated.timing(scaleAnimation, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true
          }),
          Animated.timing(scaleAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
          }),
          Animated.timing(scaleAnimation, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true
          }),
          Animated.timing(scaleAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
          })
        ])
      ]).start(() => {
        // Success haptic when animation completes
        if (winner) {
          Haptics.notificationAsync(
            winner === player1 ? 
              Haptics.NotificationFeedbackType.Success : 
              Haptics.NotificationFeedbackType.Error
          );
        }
      });
    }
  }, [result, player1Choice, player2Choice, isFlipping, flipAnimation, scaleAnimation, winner, player1]);

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

  const rotateY = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '1080deg'] // 3 full rotations
  });

  const coinOpacity = flipAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.5, 1]
  });

  return (
    <View style={styles.container}>
      {/* Compact Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.playerName, { color: colors.text }]}>
            {player1.slice(0, 6)}... vs {player2 ? `${player2.slice(0, 6)}...` : '???'}
          </Text>
        </View>
        
        <View style={styles.headerRight}>
          <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              💰 {wager}
            </Text>
          </View>
          
          <View style={[styles.badge, { backgroundColor: colors.surface }]}>
            <Ionicons name="timer-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
              {timeLeft}
            </Text>
          </View>
        </View>
      </View>

      {/* Compact Status */}
      <View style={[styles.statusBar, { 
        backgroundColor: !player2 ? colors.warning + '20' : 
                       winner ? (winner === walletAddress ? colors.primary + '20' : colors.error + '20') :
                       colors.surface 
      }]}>
        <Text style={[styles.statusText, { 
          color: !player2 ? colors.warning : 
                 winner ? (winner === walletAddress ? colors.primary : colors.error) :
                 colors.textSecondary 
        }]}>
          {!player2 ? "⏳ Waiting for opponent..." :
           winner ? (winner === walletAddress ? `🎉 You won! (${result})` : `😔 You lost! (${result})`) :
           player2 && !player2Choice ? (isPlayer2 ? "👆 Pick your side!" : "⏳ Opponent choosing...") :
           player2Choice && !result ? `Flipping... You: ${myChoice || '?'}` :
           "Ready to flip!"}
        </Text>
      </View>



      {/* Compact Choice Display */}
      {(!player2 || (canChoose && player2) || (isPlayer1 && player2 && !result)) && (
        <View style={styles.compactChoicesContainer}>
          <View style={[
            styles.choiceButton,
            { opacity: player1Choice === 'heads' ? 1 : 0.5 }
          ]}>
            <View style={[
              styles.cardBackdrop,
              { 
                backgroundColor: colors.surface,
                borderColor: player1Choice === 'heads' ? colors.primary : colors.borderLight,
                borderWidth: player1Choice === 'heads' ? 2 : 1,
              }
            ]}>
              <LinearGradient
                colors={player1Choice === 'heads' ? gradients.primary : [colors.surface, colors.background]}
                style={styles.choiceGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[styles.cardInner, { backgroundColor: colors.background + '40' }]}>
                  <View style={styles.iconWrapper}>
                    <LinearGradient
                      colors={player1Choice === 'heads' ? gradients.primary : ['#FFD700', '#FFA500']}
                      style={styles.iconBackground}
                    >
                      <Ionicons name="sunny" size={28} color="#FFF" />
                    </LinearGradient>
                    <View style={[styles.iconGlow, { backgroundColor: '#FFD700' }]} />
                  </View>
                  
                  <View style={styles.textContainer}>
                    <Text style={[
                      styles.choiceText, 
                      { color: player1Choice === 'heads' ? colors.text : colors.textSecondary }
                    ]}>
                      HEADS
                    </Text>
                    <View style={[styles.dividerLine, { backgroundColor: colors.borderLight }]} />
                    <Text style={[
                      styles.choiceSubtext,
                      { color: colors.textTertiary }
                    ]}>
                      Solar
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </View>

          <View style={[
            styles.choiceButton,
            { opacity: player1Choice === 'tails' ? 1 : 0.5 }
          ]}>
            <View style={[
              styles.cardBackdrop,
              { 
                backgroundColor: colors.surface,
                borderColor: player1Choice === 'tails' ? colors.primary : colors.borderLight,
                borderWidth: player1Choice === 'tails' ? 2 : 1,
              }
            ]}>
              <LinearGradient
                colors={player1Choice === 'tails' ? gradients.primary : [colors.surface, colors.background]}
                style={styles.choiceGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[styles.cardInner, { backgroundColor: colors.background + '40' }]}>
                  <View style={styles.iconWrapper}>
                    <LinearGradient
                      colors={player1Choice === 'tails' ? gradients.primary : ['#4A90E2', '#6B8DD6']}
                      style={styles.iconBackground}
                    >
                      <Ionicons name="moon" size={28} color="#FFF" />
                    </LinearGradient>
                    <View style={[styles.iconGlow, { backgroundColor: '#4A90E2' }]} />
                  </View>
                  
                  <View style={styles.textContainer}>
                    <Text style={[
                      styles.choiceText, 
                      { color: player1Choice === 'tails' ? colors.text : colors.textSecondary }
                    ]}>
                      TAILS
                    </Text>
                    <View style={[styles.dividerLine, { backgroundColor: colors.borderLight }]} />
                    <Text style={[
                      styles.choiceSubtext,
                      { color: colors.textTertiary }
                    ]}>
                      Lunar
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </View>
        </View>
      )}

      {/* Choice Buttons - Show for waiting games or when player2 can choose */}
      {(!player2 || (canChoose && player2)) && (
        <View style={styles.choicesContainer}>
          <TouchableOpacity
            style={[
              styles.choiceButton,
              selectedChoice === 'heads' && { transform: [{ scale: 0.95 }] }
            ]}
            onPress={() => handleChoice('heads')}
            activeOpacity={0.8}
            disabled={!canChoose || !player2}
          >
            <View style={[
              styles.cardBackdrop,
              { 
                backgroundColor: colors.surface,
                borderColor: selectedChoice === 'heads' || player2Choice === 'heads' ? colors.primary : colors.borderLight,
                borderWidth: selectedChoice === 'heads' || player2Choice === 'heads' ? 2 : 1,
                shadowColor: selectedChoice === 'heads' ? colors.primary : '#000',
                shadowOpacity: selectedChoice === 'heads' ? 0.5 : 0.2,
                opacity: !player2 ? 0.7 : 1,
              }
            ]}>
              <LinearGradient
                colors={
                  selectedChoice === 'heads' || player2Choice === 'heads' 
                    ? gradients.primary 
                    : [colors.surface, colors.background]
                }
                style={styles.choiceGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[styles.cardInner, { backgroundColor: colors.background + '40' }]}>
                  <View style={styles.iconWrapper}>
                    <LinearGradient
                      colors={selectedChoice === 'heads' || player2Choice === 'heads' ? gradients.primary : ['#FFD700', '#FFA500']}
                      style={styles.iconBackground}
                    >
                      <Ionicons name="sunny" size={28} color="#FFF" />
                    </LinearGradient>
                    {(selectedChoice === 'heads' || player2Choice === 'heads') && (
                      <View style={[styles.iconGlow, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                  
                  <View style={styles.textContainer}>
                    <Text style={[
                      styles.choiceText, 
                      { 
                        color: selectedChoice === 'heads' || player2Choice === 'heads' 
                          ? colors.text
                          : colors.textSecondary 
                      }
                    ]}>
                      HEADS
                    </Text>
                    <View style={[styles.dividerLine, { backgroundColor: colors.borderLight }]} />
                    <Text style={[
                      styles.choiceSubtext,
                      { color: colors.textTertiary }
                    ]}>
                      Solar
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.choiceButton,
              selectedChoice === 'tails' && { transform: [{ scale: 0.95 }] }
            ]}
            onPress={() => handleChoice('tails')}
            activeOpacity={0.8}
            disabled={!canChoose || !player2}
          >
            <View style={[
              styles.cardBackdrop,
              { 
                backgroundColor: colors.surface,
                borderColor: selectedChoice === 'tails' || player2Choice === 'tails' ? colors.primary : colors.borderLight,
                borderWidth: selectedChoice === 'tails' || player2Choice === 'tails' ? 2 : 1,
                shadowColor: selectedChoice === 'tails' ? colors.primary : '#000',
                shadowOpacity: selectedChoice === 'tails' ? 0.5 : 0.2,
                opacity: !player2 ? 0.7 : 1,
              }
            ]}>
              <LinearGradient
                colors={
                  selectedChoice === 'tails' || player2Choice === 'tails' 
                    ? gradients.primary 
                    : [colors.surface, colors.background]
                }
                style={styles.choiceGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[styles.cardInner, { backgroundColor: colors.background + '40' }]}>
                  <View style={styles.iconWrapper}>
                    <LinearGradient
                      colors={selectedChoice === 'tails' || player2Choice === 'tails' ? gradients.primary : ['#4A90E2', '#6B8DD6']}
                      style={styles.iconBackground}
                    >
                      <Ionicons name="moon" size={28} color="#FFF" />
                    </LinearGradient>
                    {(selectedChoice === 'tails' || player2Choice === 'tails') && (
                      <View style={[styles.iconGlow, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                  
                  <View style={styles.textContainer}>
                    <Text style={[
                      styles.choiceText, 
                      { 
                        color: selectedChoice === 'tails' || player2Choice === 'tails' 
                          ? colors.text
                          : colors.textSecondary 
                      }
                    ]}>
                      TAILS
                    </Text>
                    <View style={[styles.dividerLine, { backgroundColor: colors.borderLight }]} />
                    <Text style={[
                      styles.choiceSubtext,
                      { color: colors.textTertiary }
                    ]}>
                      Lunar
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Result Display */}
      {winner && (
        <LinearGradient
          colors={winner === walletAddress ? gradients.primary : ['#FF6B6B', '#FF4444']}
          style={styles.resultBar}
        >
          <Text style={styles.resultText}>
            {winner === walletAddress ? '🎉 You Win! 🎉' : '😔 You Lose 😔'}
          </Text>
          <Text style={styles.resultDetail}>
            The coin landed on {result}!
          </Text>
        </LinearGradient>
      )}

      {/* Player Choices Display */}
      {player1Choice && player2Choice && (
        <View style={[styles.choicesDisplay, { backgroundColor: colors.surface }]}>
          <View style={styles.playerChoice}>
            <Text style={[styles.choiceLabel, { color: colors.textSecondary }]}>You chose</Text>
            <Text style={[styles.choiceValue, { color: colors.primary }]}>
              {myChoice?.toUpperCase()}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.playerChoice}>
            <Text style={[styles.choiceLabel, { color: colors.textSecondary }]}>Opponent chose</Text>
            <Text style={[styles.choiceValue, { color: colors.secondary }]}>
              {(isPlayer1 ? player2Choice : player1Choice)?.toUpperCase()}
            </Text>
          </View>
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
            <View style={[styles.selectedChoiceDisplay, { backgroundColor: colors.background }]}>
              <LinearGradient
                colors={selectedChoice === 'heads' ? ['#FFD700', '#FFA500'] : ['#4A90E2', '#6B8DD6']}
                style={styles.selectedIcon}
              >
                <Ionicons 
                  name={selectedChoice === 'heads' ? 'sunny' : 'moon'} 
                  size={24} 
                  color="#FFF" 
                />
              </LinearGradient>
              <Text style={[styles.selectedText, { color: colors.primary }]}>
                {selectedChoice.toUpperCase()}
              </Text>
            </View>
            <View style={styles.wagerDetails}>
              <View style={[styles.wagerInfo, { backgroundColor: colors.error + '15' }]}>
                <Ionicons name="remove-circle" size={20} color={colors.error} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.wagerAmount, { color: colors.error }]}>
                    Risk: {wager} ALLY
                  </Text>
                  <Text style={[styles.wagerNote, { color: colors.textSecondary }]}>
                    Will be deducted now
                  </Text>
                </View>
              </View>
              
              <View style={[styles.wagerInfo, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="trophy" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.wagerAmount, { color: colors.primary }]}>
                    Win: {wager * 2} ALLY
                  </Text>
                  <Text style={[styles.wagerNote, { color: colors.textSecondary }]}>
                    Total payout if you win
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.surface }]}
                onPress={cancelChoice}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                  Change
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
                    Confirm & Play
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
    marginBottom: 16,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  playerName: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
  },
  vs: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    marginHorizontal: 12,
  },
  gameInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  wagerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  wagerText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timerText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
  },
  statusBar: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  statusText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
  },
  coinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    marginVertical: 20,
  },
  coin: {
    width: 150,
    height: 150,
  },
  coinGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  coinResult: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    marginTop: 4,
  },
  coinSides: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  choicesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  choiceButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardBackdrop: {
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  choiceGradient: {
    flex: 1,
    borderRadius: 20,
    padding: 2,
  },
  cardInner: {
    flex: 1,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    gap: 16,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBackground: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  iconGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.2,
    zIndex: -1,
  },
  textContainer: {
    alignItems: 'center',
    gap: 6,
  },
  dividerLine: {
    width: 40,
    height: 1,
    opacity: 0.5,
  },
  choiceSubtext: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  choiceText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  resultBar: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
    alignItems: 'center',
  },
  resultText: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: '#000',
  },
  resultDetail: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: '#000',
    marginTop: 4,
  },
  choicesDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  playerChoice: {
    alignItems: 'center',
    flex: 1,
  },
  choiceLabel: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
  },
  choiceValue: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#00000020',
    marginHorizontal: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    flex: 1,
  },
  confirmationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    padding: 24,
    alignItems: 'center',
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    width: '90%',
    maxWidth: 340,
  },
  confirmationTitle: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
  },
  selectedChoiceDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  selectedIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedText: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
  },
  wagerDetails: {
    width: '100%',
    gap: 8,
  },
  wagerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    width: '100%',
  },
  wagerAmount: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
  },
  wagerNote: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cancelButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
  },
  confirmButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  confirmButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: '#000',
  },
});