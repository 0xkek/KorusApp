import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { useGames } from '../context/GameContext';
import { Fonts, FontSizes } from '../constants/Fonts';
import GameSelectionModal from './GameSelectionModal';
import GameJoinModal from './GameJoinModal';
import { Post as PostType, GameType } from '../types';
import { config } from '../config/environment';

interface GamesViewProps {
  posts: PostType[];
  currentUserWallet: string;
  onCreateGame: (gameData: { type: GameType; wager: number }) => void;
}

export default function GamesView({ 
  posts, 
  currentUserWallet, 
  onCreateGame 
}: GamesViewProps) {
  const { colors, isDarkMode, gradients } = useTheme();
  const { balance } = useWallet();
  const { gamePosts } = useGames();
  const router = useRouter();
  const [showGameSelection, setShowGameSelection] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState<{ postId: number; gameType: GameType; wager: number } | null>(null);

  // Get sample games from global context (for demo purposes only)
  const sampleGames: PostType[] = config.showDemoContent ? ((global as any).sampleGames || [
    {
      id: 9999,
      wallet: 'DeMo1K8tQpVHgLpQeN4eSkVHgfr6k6pVxZfO3syhUser',
      time: 'Just now',
      content: 'Looking for a Tic Tac Toe opponent!',
      likes: 0,
      replies: [],
      tips: 0,
      liked: false,
      category: 'GAMES',
      isPremium: true,
      userTheme: '#43e97b',
      gameData: {
        type: 'tictactoe',
        wager: 25,
        player1: 'DeMo1K8tQpVHgLpQeN4eSkVHgfr6k6pVxZfO3syhUser',
        status: 'waiting',
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000, // 5 minutes
        board: [[null, null, null], [null, null, null], [null, null, null]]
      }
    },
    {
      id: 9998,
      wallet: 'RpS2K8tQpVHgLpQeN4eSkVHgfr6k6pVxZfO3syhGamer',
      time: '2m ago',
      content: 'Rock Paper Scissors - Best of 3!',
      likes: 1,
      replies: [],
      tips: 0,
      liked: false,
      category: 'GAMES',
      isPremium: false,
      userTheme: '#FF6B6B',
      gameData: {
        type: 'rps',
        wager: 50,
        player1: 'RpS2K8tQpVHgLpQeN4eSkVHgfr6k6pVxZfO3syhGamer',
        status: 'waiting',
        createdAt: Date.now() - 120000,
        expiresAt: Date.now() + 300000, // 5 minutes
      }
    },
    {
      id: 9997,
      wallet: 'C4nN3K8tQpVHgLpQeN4eSkVHgfr6k6pVxZfO3syhCon4',
      time: '5m ago',
      content: 'Connect Four challenge - get 4 in a row!',
      likes: 2,
      replies: [],
      tips: 0,
      liked: false,
      category: 'GAMES',
      isPremium: true,
      userTheme: '#4ECDC4',
      gameData: {
        type: 'connect4',
        wager: 15,
        player1: 'C4nN3K8tQpVHgLpQeN4eSkVHgfr6k6pVxZfO3syhCon4',
        status: 'waiting',
        createdAt: Date.now() - 300000,
        expiresAt: Date.now() + 300000, // 5 minutes
        board: Array(6).fill(null).map(() => Array(7).fill(null))
      }
    }
  ]) : [];

  // Filter only posts with games - combine all sources
  const feedGamePosts = posts.filter(post => post.gameData && post.category === 'GAMES');
  const contextGamePosts = gamePosts.filter(post => post.gameData && post.category === 'GAMES');
  
  // Combine unique game posts from both sources
  const allGamePosts = [...feedGamePosts];
  contextGamePosts.forEach(contextPost => {
    if (!allGamePosts.find(p => p.id === contextPost.id)) {
      allGamePosts.push(contextPost);
    }
  });
  
  // Use real posts if available, fallback to samples
  const displayPosts = allGamePosts.length > 0 ? allGamePosts : sampleGames;

  // Separate active and waiting games
  const activeGames = displayPosts.filter(post => post.gameData?.status === 'active');
  const waitingGames = displayPosts.filter(post => post.gameData?.status === 'waiting');
  const completedGames = displayPosts.filter(post => post.gameData?.status === 'completed');

  const handleGameSelect = (gameType: GameType, wager: number) => {
    onCreateGame({ type: gameType, wager });
    setShowGameSelection(false);
  };

  const handleJoinClick = (postId: number, gameType: GameType, wager: number) => {
    setSelectedGame({ postId, gameType, wager });
    setShowJoinModal(true);
  };

  const handleConfirmJoin = () => {
    if (selectedGame) {
      setShowJoinModal(false);
      // Navigate directly to the game screen
      router.push(`/game/${selectedGame.postId}`);
      setSelectedGame(null);
    }
  };

  const GameCard = ({ post }: { post: PostType }) => {
    if (!post.gameData) return null;

    const isPlayer1 = post.gameData.player1?.toLowerCase() === currentUserWallet.toLowerCase();
    const isPlayer2 = post.gameData.player2?.toLowerCase() === currentUserWallet.toLowerCase();
    const isParticipant = isPlayer1 || isPlayer2;
    const canJoin = post.gameData.status === 'waiting' && !isParticipant;

    const getGameIcon = (type: GameType) => {
      switch (type) {
        case 'tictactoe': return 'grid-outline';
        case 'rps': return 'hand-left-outline';
        case 'connect4': return 'apps-outline';
        case 'coinflip': return 'logo-bitcoin';
        default: return 'game-controller-outline';
      }
    };

    const getGameName = (type: GameType) => {
      switch (type) {
        case 'tictactoe': return 'Tic Tac Toe';
        case 'rps': return 'Rock Paper Scissors';
        case 'connect4': return 'Connect Four';
        case 'coinflip': return 'Coin Flip';
        default: return 'Game';
      }
    };

    return (
      <TouchableOpacity
        style={[styles.gameCard, { borderColor: colors.border }]}
        onPress={() => {
          if (canJoin) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleJoinClick(post.id, post.gameData.type, post.gameData.wager);
          } else if (isParticipant && post.gameData.status === 'active') {
            // Navigate to active game
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/game/${post.id}`);
          }
        }}
        activeOpacity={canJoin || (isParticipant && post.gameData.status === 'active') ? 0.8 : 1}
      >
        <LinearGradient
          colors={gradients.surface}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.gameIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name={getGameIcon(post.gameData.type)} size={24} color={colors.primary} />
            </View>
            <View style={styles.gameInfo}>
              <Text style={[styles.gameName, { color: colors.text }]}>
                {getGameName(post.gameData.type)}
              </Text>
              <Text style={[styles.wagerText, { color: colors.textSecondary }]}>
                {post.gameData.wager} ALLY
              </Text>
            </View>
          </View>

          <View style={styles.cardStatus}>
            {post.gameData.status === 'waiting' && (
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, { backgroundColor: '#FFD700' + '20' }]}>
                  <Text style={[styles.statusText, { color: '#FFD700' }]}>
                    Waiting for opponent
                  </Text>
                </View>
                {canJoin && (
                  <TouchableOpacity
                    style={styles.joinButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      handleJoinClick(post.id, post.gameData.type, post.gameData.wager);
                    }}
                  >
                    <LinearGradient
                      colors={gradients.primary}
                      style={styles.joinButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={[styles.joinButtonText, { color: isDarkMode ? '#000' : '#000' }]}>
                        Join Game
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {post.gameData.status === 'active' && (
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.statusText, { color: colors.primary }]}>
                    {isParticipant ? 'Your turn to play!' : 'Game in progress'}
                  </Text>
                </View>
                {isParticipant && (
                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      router.push(`/game/${post.id}`);
                    }}
                  >
                    <LinearGradient
                      colors={gradients.primary}
                      style={styles.playButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={[styles.playButtonText, { color: isDarkMode ? '#000' : '#000' }]}>
                        Play Now
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {post.gameData.status === 'completed' && (
              <View style={[styles.statusBadge, { backgroundColor: colors.success + '20' }]}>
                <Text style={[styles.statusText, { color: colors.success }]}>
                  Completed
                </Text>
              </View>
            )}
          </View>

          <View style={styles.playerInfo}>
            <Text style={[styles.playerLabel, { color: colors.textTertiary }]}>
              Player 1: {post.gameData.player1.slice(0, 6)}...{post.gameData.player1.slice(-4)}
            </Text>
            {post.gameData.player2 && (
              <Text style={[styles.playerLabel, { color: colors.textTertiary }]}>
                Player 2: {post.gameData.player2.slice(0, 6)}...{post.gameData.player2.slice(-4)}
              </Text>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Games Arena</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowGameSelection(true)}
        >
          <LinearGradient
            colors={gradients.primary}
            style={styles.createButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={20} color={isDarkMode ? '#000' : '#000'} />
            <Text style={[styles.createButtonText, { color: isDarkMode ? '#000' : '#000' }]}>
              Create Game
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Games */}
        {activeGames.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Active Games</Text>
            {activeGames.map(post => (
              <GameCard key={post.id} post={post} />
            ))}
          </View>
        )}

        {/* Waiting for Opponents */}
        {waitingGames.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#FFD700' }]}>Join a Game</Text>
            {waitingGames.map(post => (
              <GameCard key={post.id} post={post} />
            ))}
          </View>
        )}

        {/* Completed Games */}
        {completedGames.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Recent Games</Text>
            {completedGames.slice(0, 5).map(post => (
              <GameCard key={post.id} post={post} />
            ))}
          </View>
        )}

        {/* Empty State */}
        {gamePosts.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="game-controller-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              No games yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              Create a game and challenge other players!
            </Text>
          </View>
        )}
      </ScrollView>

      <GameSelectionModal
        visible={showGameSelection}
        onClose={() => setShowGameSelection(false)}
        onSelectGame={handleGameSelect}
        balance={balance}
      />

      <GameJoinModal
        visible={showJoinModal}
        gameType={selectedGame?.gameType || null}
        wager={selectedGame?.wager || 0}
        onClose={() => {
          setShowJoinModal(false);
          setSelectedGame(null);
        }}
        onConfirm={handleConfirmJoin}
        walletBalance={balance}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 15,
    marginTop: 0,
  },
  title: {
    fontSize: FontSizes['2xl'],
    fontFamily: Fonts.bold,
    letterSpacing: -0.5,
  },
  createButton: {
    borderRadius: 20,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  createButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    marginBottom: 12,
  },
  gameCard: {
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
  },
  wagerText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  cardStatus: {
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
  },
  joinButton: {
    borderRadius: 16,
  },
  joinButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
  },
  joinButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
  },
  playButton: {
    borderRadius: 16,
  },
  playButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
  },
  playButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
  },
  playerInfo: {
    gap: 4,
  },
  playerLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.semiBold,
    marginTop: 16,
  },
  emptyText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginTop: 8,
  },
});