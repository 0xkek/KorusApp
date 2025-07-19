import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { Fonts, FontSizes } from '../constants/Fonts';
import { GameData } from '../types';
import TicTacToeGame from './games/TicTacToeGame';
import RockPaperScissorsGame from './games/RockPaperScissorsGame';
import CoinFlipGame from './games/CoinFlipGameCompact';

interface GamePostProps {
  gameData: GameData;
  postId: number;
  onJoinGame: (postId: number) => void;
  onMakeMove?: (postId: number, moveData: any, moveType?: string) => void;
}

export default function GamePost({ gameData, postId, onJoinGame, onMakeMove }: GamePostProps) {
  const { colors, gradients, isDarkMode } = useTheme();
  const { walletAddress, balance } = useWallet();
  
  // Ensure case-insensitive comparison for wallet addresses
  const isPlayer1 = gameData.player1?.toLowerCase() === walletAddress?.toLowerCase();
  const isPlayer2 = gameData.player2?.toLowerCase() === walletAddress?.toLowerCase();
  const isParticipant = isPlayer1 || isPlayer2;
  const isMyTurn = gameData.currentPlayer?.toLowerCase() === walletAddress?.toLowerCase();
  
  const canJoin = !isParticipant && gameData.status === 'waiting' && balance >= gameData.wager;

  const handleJoinGame = () => {
    if (canJoin) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onJoinGame(postId);
    }
  };

  const handleMove = (moveData: any, moveType?: string) => {
    if (onMakeMove && isMyTurn && gameData.status === 'active') {
      onMakeMove(postId, moveData, moveType);
    }
  };

  const getGameIcon = () => {
    switch (gameData.type) {
      case 'tictactoe': return 'grid-outline';
      case 'rps': return 'hand-left-outline';
      case 'coinflip': return 'disc-outline';
      case 'connect4': return 'apps-outline';
      default: return 'game-controller-outline';
    }
  };

  const getGameName = () => {
    switch (gameData.type) {
      case 'tictactoe': return 'Tic Tac Toe';
      case 'rps': return 'Rock Paper Scissors';
      case 'coinflip': return 'Coin Flip';
      case 'connect4': return 'Connect 4';
      default: return 'Game';
    }
  };

  return (
    <View 
      style={[styles.container, { backgroundColor: colors.cardBackground }]}
      onStartShouldSetResponder={() => true} // Prevent parent TouchableOpacity from handling taps
    >
      {/* Game Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name={getGameIcon() as any} size={24} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.gameName, { color: colors.text }]}>{getGameName()}</Text>
            <Text style={[styles.wagerText, { color: colors.textSecondary }]}>
              💰 {gameData.wager} ALLY wager
            </Text>
          </View>
        </View>
        
        {/* Game Status Badge */}
        <View style={[
          styles.statusBadge, 
          { 
            backgroundColor: gameData.status === 'waiting' ? colors.warning + '20' :
                           gameData.status === 'active' ? colors.primary + '20' :
                           gameData.status === 'completed' ? colors.secondary + '20' :
                           colors.error + '20'
          }
        ]}>
          <Text style={[
            styles.statusText, 
            { 
              color: gameData.status === 'waiting' ? colors.warning :
                     gameData.status === 'active' ? colors.primary :
                     gameData.status === 'completed' ? colors.secondary :
                     colors.error
            }
          ]}>
            {gameData.status === 'waiting' ? 'Waiting for opponent' :
             gameData.status === 'active' ? 'Game in progress' :
             gameData.status === 'completed' ? 'Game finished' :
             'Game expired'}
          </Text>
        </View>
      </View>

      {/* Game Content */}
      <View style={styles.gameContent}>
        {gameData.type === 'tictactoe' && gameData.board && (
          <TicTacToeGame
            gameId={postId.toString()}
            player1={gameData.player1}
            player2={gameData.player2 || null}
            currentPlayer={gameData.currentPlayer || gameData.player1}
            isMyTurn={isMyTurn}
            wager={gameData.wager}
            onMove={(row, col) => handleMove(row, col)}
            board={gameData.board}
            winner={gameData.winner as any}
            expiresAt={gameData.expiresAt}
          />
        )}
        
        {gameData.type === 'rps' && (
          <RockPaperScissorsGame
            key={`rps-${postId}`}
            gameId={postId.toString()}
            player1={gameData.player1}
            player2={gameData.player2 || null}
            currentPlayer={gameData.currentPlayer || gameData.player1}
            isMyTurn={isMyTurn}
            wager={gameData.wager}
            onMove={(choice) => handleMove(choice, 'rps')}
            rounds={gameData.rounds || []}
            currentRound={gameData.currentRound || 1}
            winner={gameData.winner || null}
            expiresAt={gameData.expiresAt}
            gameStatus={gameData.status}
          />
        )}
        
        {gameData.type === 'coinflip' && (
          <CoinFlipGame
            key={`coin-${postId}`}
            gameId={postId.toString()}
            player1={gameData.player1}
            player2={gameData.player2 || null}
            wager={gameData.wager}
            onChoose={(choice) => handleMove(choice, 'coinflip')}
            player1Choice={gameData.player1Choice || null}
            player2Choice={gameData.player2Choice || null}
            result={gameData.result || null}
            winner={gameData.winner || null}
            expiresAt={gameData.expiresAt}
          />
        )}
        
        {gameData.type === 'connect4' && (
          <View style={styles.comingSoon}>
            <Text style={[styles.comingSoonText, { color: colors.textSecondary }]}>
              Connect 4 coming soon!
            </Text>
          </View>
        )}
      </View>

      {/* Join Game Button */}
      {canJoin && (
        <TouchableOpacity
          style={styles.joinButton}
          onPress={handleJoinGame}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={gradients.primary}
            style={styles.joinButtonGradient}
          >
            <Text style={styles.joinButtonText}>
              Join Game ({gameData.wager} ALLY)
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
      
      {/* Insufficient Balance Warning */}
      {!isParticipant && gameData.status === 'waiting' && balance < gameData.wager && (
        <View style={[styles.warningContainer, { backgroundColor: colors.error + '20' }]}>
          <Ionicons name="alert-circle" size={20} color={colors.error} />
          <Text style={[styles.warningText, { color: colors.error }]}>
            Insufficient balance. You need {gameData.wager} ALLY to join.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameName: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
  },
  wagerText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
  },
  gameContent: {
    marginBottom: 16,
  },
  comingSoon: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
  },
  joinButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  joinButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: '#000',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  warningText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    flex: 1,
  },
});