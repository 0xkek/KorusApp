import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { Fonts, FontSizes } from '../constants/Fonts';
import { config } from '../config/environment';

type GameType = 'tictactoe' | 'connect4' | 'rps' | 'coinflip';

interface Game {
  id: GameType;
  name: string;
  icon: string;
  description: string;
  minWager: number;
  maxWager: number;
  duration: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

const GAMES: Game[] = [
  {
    id: 'tictactoe',
    name: 'Tic Tac Toe',
    icon: 'grid-outline',
    description: 'Classic 3x3 strategy game',
    minWager: config.minWagerAmount,
    maxWager: config.maxWagerAmount,
    duration: '5-10 min',
    difficulty: 'Easy'
  },
  {
    id: 'rps',
    name: 'Rock Paper Scissors',
    icon: 'hand-left-outline',
    description: 'Best of 3 rounds',
    minWager: config.minWagerAmount,
    maxWager: config.maxWagerAmount,
    duration: '2-5 min',
    difficulty: 'Easy'
  },
  {
    id: 'coinflip',
    name: 'Coin Flip',
    icon: 'disc-outline',
    description: 'Simple heads or tails',
    minWager: config.minWagerAmount,
    maxWager: config.maxWagerAmount,
    duration: 'Instant',
    difficulty: 'Easy'
  },
  {
    id: 'connect4',
    name: 'Connect 4',
    icon: 'apps-outline',
    description: 'Connect 4 in a row to win',
    minWager: config.minWagerAmount,
    maxWager: config.maxWagerAmount,
    duration: '10-15 min',
    difficulty: 'Medium'
  }
];

interface GameSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectGame: (gameType: GameType, wager: number) => void;
  balance: number;
}

export default function GameSelectionModal({
  visible,
  onClose,
  onSelectGame,
  balance
}: GameSelectionModalProps) {
  const { colors, gradients, isDarkMode } = useTheme();
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [wager, setWager] = useState('100');
  const [showWagerInput, setShowWagerInput] = useState(false);

  const handleGameSelect = (game: Game) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGame(game.id);
    setShowWagerInput(true);
    setWager(game.minWager.toString());
  };

  const handleCreateGame = () => {
    if (!selectedGame) return;
    
    const wagerAmount = parseInt(wager) || 0;
    const game = GAMES.find(g => g.id === selectedGame);
    
    if (!game || wagerAmount < game.minWager || wagerAmount > game.maxWager) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (wagerAmount > balance) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectGame(selectedGame, wagerAmount);
    resetModal();
  };

  const resetModal = () => {
    setSelectedGame(null);
    setShowWagerInput(false);
    setWager('100');
    onClose();
  };

  const selectedGameData = GAMES.find(g => g.id === selectedGame);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={resetModal}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={resetModal}
        />
        
        <View style={styles.modalContent}>
          <BlurView intensity={40} style={styles.blurWrapper}>
            <LinearGradient
              colors={gradients.surface}
              style={styles.contentContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {showWagerInput ? 'Set Your Wager' : 'Choose a Game'}
                </Text>
                <TouchableOpacity onPress={resetModal} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {!showWagerInput ? (
                <ScrollView style={styles.gameList} showsVerticalScrollIndicator={false}>
                  {GAMES.map((game) => (
                    <TouchableOpacity
                      key={game.id}
                      style={[styles.gameCard, { backgroundColor: colors.cardBackground }]}
                      onPress={() => handleGameSelect(game)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.gameIcon, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons name={game.icon as any} size={32} color={colors.primary} />
                      </View>
                      
                      <View style={styles.gameInfo}>
                        <Text style={[styles.gameName, { color: colors.text }]}>
                          {game.name}
                        </Text>
                        <Text style={[styles.gameDescription, { color: colors.textSecondary }]}>
                          {game.description}
                        </Text>
                        
                        <View style={styles.gameStats}>
                          <View style={styles.stat}>
                            <Ionicons name="timer-outline" size={14} color={colors.textTertiary} />
                            <Text style={[styles.statText, { color: colors.textTertiary }]}>
                              {game.duration}
                            </Text>
                          </View>
                          
                          <View style={styles.stat}>
                            <Ionicons name="trending-up-outline" size={14} color={colors.textTertiary} />
                            <Text style={[styles.statText, { color: colors.textTertiary }]}>
                              {game.difficulty}
                            </Text>
                          </View>
                          
                          <View style={styles.stat}>
                            <Text style={[styles.statText, { color: colors.textTertiary }]}>
                              💰 {game.minWager}-{game.maxWager}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.wagerSection}>
                  {selectedGameData && (
                    <View style={[styles.selectedGame, { backgroundColor: colors.cardBackground }]}>
                      <Ionicons 
                        name={selectedGameData.icon as any} 
                        size={24} 
                        color={colors.primary} 
                      />
                      <Text style={[styles.selectedGameName, { color: colors.text }]}>
                        {selectedGameData.name}
                      </Text>
                    </View>
                  )}

                  <View style={styles.wagerInputContainer}>
                    <Text style={[styles.wagerLabel, { color: colors.textSecondary }]}>
                      Wager Amount (ALLY)
                    </Text>
                    
                    <View style={[styles.wagerInputWrapper, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.currencySymbol, { color: colors.primary }]}>
                        💰
                      </Text>
                      <TextInput
                        style={[styles.wagerInput, { color: colors.text }]}
                        value={wager}
                        onChangeText={setWager}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors.textTertiary}
                      />
                      <Text style={[styles.currencyText, { color: colors.textSecondary }]}>
                        ALLY
                      </Text>
                    </View>

                    <View style={styles.wagerLimits}>
                      <Text style={[styles.limitText, { color: colors.textTertiary }]}>
                        Min: {selectedGameData?.minWager} ALLY
                      </Text>
                      <Text style={[styles.limitText, { color: colors.textTertiary }]}>
                        Max: {selectedGameData?.maxWager} ALLY
                      </Text>
                    </View>

                    <View style={[styles.balanceInfo, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
                        Your Balance:
                      </Text>
                      <Text style={[styles.balanceAmount, { color: colors.primary }]}>
                        {balance.toFixed(2)} ALLY
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.backButton, { borderColor: colors.borderLight }]}
                      onPress={() => setShowWagerInput(false)}
                    >
                      <Text style={[styles.backButtonText, { color: colors.textSecondary }]}>
                        Back
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.createButton}
                      onPress={handleCreateGame}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={gradients.primary}
                        style={styles.createButtonGradient}
                      >
                        <Text style={styles.createButtonText}>
                          Create Game
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </LinearGradient>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  blurWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  contentContainer: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
  },
  closeButton: {
    padding: 4,
  },
  gameList: {
    maxHeight: 400,
  },
  gameCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  gameIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
    marginBottom: 4,
  },
  gameDescription: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    marginBottom: 8,
  },
  gameStats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
  },
  wagerSection: {
    gap: 20,
  },
  selectedGame: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  selectedGameName: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
  },
  wagerInputContainer: {
    gap: 12,
  },
  wagerLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
  },
  wagerInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  currencySymbol: {
    fontSize: FontSizes.xl,
  },
  wagerInput: {
    flex: 1,
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
  },
  currencyText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
  },
  wagerLimits: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  limitText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
  },
  balanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
  },
  balanceLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
  },
  balanceAmount: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  backButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
  },
  createButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: '#000',
  },
});