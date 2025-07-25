import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import { Fonts, FontSizes } from '../../constants/Fonts';

type Cell = 'RED' | 'YELLOW' | null;
type Board = Cell[][];

interface ConnectFourGameProps {
  gameId: string;
  player1: string;
  player2: string | null;
  currentPlayer: string;
  isMyTurn: boolean;
  wager: number;
  onMove: (column: number) => void;
  board: Board;
  winner: string | 'draw' | null;
  expiresAt: number;
}

const ROWS = 6;
const COLS = 7;

export default function ConnectFourGame({
  gameId,
  player1,
  player2,
  currentPlayer,
  isMyTurn,
  wager,
  onMove,
  board,
  winner,
  expiresAt
}: ConnectFourGameProps) {
  const { colors, gradients, isDarkMode } = useTheme();
  const { walletAddress } = useWallet();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [dropAnimation] = useState(new Animated.Value(0));
  
  // Ensure board is always defined
  const gameBoard = board || Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
  
  const isPlayer1 = walletAddress === player1;
  const isPlayer2 = walletAddress === player2;
  const myColor = isPlayer1 ? 'RED' : 'YELLOW';
  
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

  const handleColumnPress = (col: number) => {
    if (!isMyTurn || winner || !player2) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackStyle.Warning);
      return;
    }

    // Check if column is full
    if (gameBoard[0][col] !== null) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackStyle.Warning);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Animate drop
    Animated.sequence([
      Animated.timing(dropAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(dropAnimation, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();

    onMove(col);
  };

  const getCellColor = (cell: Cell) => {
    if (!cell) return colors.cardBackground;
    return cell === 'RED' ? colors.primary : colors.secondary;
  };

  const getCellContent = (cell: Cell) => {
    if (!cell) return null;
    
    return (
      <View style={[
        styles.piece,
        { 
          backgroundColor: getCellColor(cell),
          shadowColor: getCellColor(cell),
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.8,
          shadowRadius: 4,
          elevation: 8
        }
      ]} />
    );
  };

  return (
    <View style={styles.container}>
      {/* Game Timer */}
      <View style={styles.header}>
        <View style={[styles.timerBadge, { backgroundColor: colors.surface }]}>
          <Ionicons name="timer-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.timerText, { color: colors.textSecondary }]}>
            {timeLeft}
          </Text>
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

      {player2 && !winner && (
        <View style={[styles.statusBar, { backgroundColor: isMyTurn ? colors.primary + '20' : colors.surface }]}>
          <Text style={[styles.statusText, { color: isMyTurn ? colors.primary : colors.textSecondary }]}>
            {isMyTurn ? `Your turn! Drop a ${myColor === 'RED' ? '🔴' : '🟡'}` : "Opponent's turn..."}
          </Text>
        </View>
      )}

      {winner && (
        <LinearGradient
          colors={winner === 'draw' ? [colors.warning, colors.secondary] : gradients.primary}
          style={styles.winnerBar}
        >
          <Text style={styles.winnerText}>
            {winner === 'draw' ? '🤝 Draw!' : 
             winner === walletAddress ? '🎉 You Win!' : '😔 You Lost!'}
          </Text>
        </LinearGradient>
      )}

      {/* Game Board */}
      <LinearGradient
        colors={gradients.surface}
        style={[styles.board, { 
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 8
        }]}
      >
        {/* Column Buttons */}
        <View style={styles.columnButtons}>
          {Array(COLS).fill(null).map((_, col) => (
            <TouchableOpacity
              key={col}
              style={[
                styles.columnButton,
                { 
                  backgroundColor: isMyTurn && player2 && !winner ? colors.primary + '20' : 'transparent',
                  opacity: !gameBoard[0] || gameBoard[0][col] !== null ? 0.3 : 1
                }
              ]}
              onPress={() => handleColumnPress(col)}
              disabled={!player2 || !isMyTurn || !!winner || (gameBoard[0] && gameBoard[0][col] !== null)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="chevron-down" 
                size={20} 
                color={isMyTurn && player2 && !winner ? colors.primary : colors.textTertiary} 
              />
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Game Grid */}
        <View style={styles.grid}>
          {gameBoard && Array.isArray(gameBoard) && gameBoard.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.row}>
              {row && Array.isArray(row) && row.map((cell, colIndex) => (
                <View
                  key={`cell-${rowIndex}-${colIndex}`}
                  style={[
                    styles.cell,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: colors.borderLight,
                    }
                  ]}
                >
                  {getCellContent(cell)}
                </View>
              ))}
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Game Instructions */}
      <View style={[styles.instructions, { backgroundColor: colors.surface + '60' }]}>
        <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
          🎯 Get 4 in a row (horizontal, vertical, or diagonal) to win!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
  winnerBar: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  winnerText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
    color: '#000',
  },
  board: {
    borderRadius: 16,
    padding: 8,
    marginBottom: 12,
  },
  columnButtons: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  columnButton: {
    flex: 1,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  grid: {
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 50,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginHorizontal: 2,
  },
  piece: {
    width: '80%',
    height: '80%',
    borderRadius: 50,
    position: 'absolute',
  },
  instructions: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  instructionsText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
});