import React, { useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import { Fonts, FontSizes } from '../../constants/Fonts';

interface TicTacToeGameProps {
  gameId: string;
  player1: string;
  player2: string | null;
  currentPlayer: string;
  isMyTurn: boolean;
  wager: number;
  onMove: (row: number, col: number) => void;
  board: (string | null)[][];
  winner: string | null | 'draw';
  expiresAt: number;
}

const { width: screenWidth } = Dimensions.get('window');
const BOARD_SIZE = Math.min(screenWidth - 48, 360);
const CELL_SIZE = (BOARD_SIZE - 4) / 3;

export default function TicTacToeGameV3({
  player1,
  player2,
  currentPlayer,
  isMyTurn,
  wager,
  board,
  winner,
  onMove,
}: TicTacToeGameProps) {
  const { colors, isDarkMode, gradients } = useTheme();
  const { walletAddress } = useWallet();
  
  const gameBoard = board || [[null, null, null], [null, null, null], [null, null, null]];
  const animatedValues = useRef(
    gameBoard.map(row => row.map(() => new Animated.Value(0)))
  ).current;

  const isPlayer1 = walletAddress?.toLowerCase() === player1?.toLowerCase();
  const currentSymbol = currentPlayer?.toLowerCase() === player1?.toLowerCase() ? 'X' : 'O';
  const mySymbol = isPlayer1 ? 'X' : 'O';

  const handleCellPress = (row: number, col: number) => {
    if (!isMyTurn || gameBoard[row][col] || winner || !player2) {
      if (!player2 || !isMyTurn) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Animated.spring(animatedValues[row][col], {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();

    onMove(row, col);
  };

  const renderCell = (value: string | null, row: number, col: number) => {
    const scale = animatedValues[row][col];
    const isWinningCell = checkIfWinningCell(row, col);
    
    return (
      <TouchableOpacity
        style={[
          styles.cell,
          {
            borderRightWidth: col < 2 ? 1 : 0,
            borderBottomWidth: row < 2 ? 1 : 0,
            borderColor: colors.borderLight,
            backgroundColor: isWinningCell && winner && winner !== 'draw' 
              ? (winner === walletAddress ? colors.primary + '20' : colors.error + '20')
              : 'transparent',
          },
        ]}
        onPress={() => handleCellPress(row, col)}
        activeOpacity={0.7}
        disabled={!!value || !isMyTurn || !!winner || !player2}
      >
        {value ? (
          <Animated.View
            style={{
              transform: [{ scale }],
            }}
          >
            <Text
              style={[
                styles.cellText,
                {
                  color: value === 'X' ? colors.primary : colors.secondary,
                  opacity: isWinningCell ? 1 : 0.9,
                  textShadowColor: value === 'X' ? colors.primary + '66' : colors.secondary + '66',
                },
              ]}
            >
              {value}
            </Text>
          </Animated.View>
        ) : (
          isMyTurn && !winner && player2 && (
            <Text style={[styles.hintText, { color: colors.primary + '20' }]}>
              {mySymbol}
            </Text>
          )
        )}
      </TouchableOpacity>
    );
  };

  const checkIfWinningCell = (row: number, col: number): boolean => {
    if (!winner || winner === 'draw' || !gameBoard[row][col]) return false;

    // Check row
    if (gameBoard[row][0] === gameBoard[row][1] && gameBoard[row][1] === gameBoard[row][2]) {
      return true;
    }

    // Check column
    if (gameBoard[0][col] === gameBoard[1][col] && gameBoard[1][col] === gameBoard[2][col]) {
      return true;
    }

    // Check diagonals
    if (row === col && gameBoard[0][0] === gameBoard[1][1] && gameBoard[1][1] === gameBoard[2][2]) {
      return true;
    }
    if (row + col === 2 && gameBoard[0][2] === gameBoard[1][1] && gameBoard[1][1] === gameBoard[2][0]) {
      return true;
    }

    return false;
  };

  return (
    <View style={styles.container}>
      {/* Status */}
      {!winner && (
        <LinearGradient
          colors={isMyTurn && player2 ? gradients.primary : gradients.button}
          style={[styles.statusContainer, { 
            borderColor: isMyTurn && player2 ? colors.primary + '66' : colors.borderLight,
          }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={[styles.statusText, { 
            color: isMyTurn && player2 ? (isDarkMode ? '#000' : '#fff') : colors.textSecondary 
          }]}>
            {!player2 ? 'Waiting for opponent...' :
             isMyTurn ? `Your turn (${mySymbol})` : 
             `Opponent's turn (${currentSymbol === 'X' ? 'O' : 'X'})`}
          </Text>
        </LinearGradient>
      )}

      {/* Game Board */}
      <View style={[styles.boardContainer, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
        <LinearGradient
          colors={gradients.surface}
          style={styles.boardBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.board}>
          {gameBoard.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex))}
            </View>
          ))}
        </View>
      </View>

      {/* Result */}
      {winner && (
        <LinearGradient
          colors={winner === 'draw' 
            ? gradients.button 
            : winner === walletAddress 
              ? [colors.primary + '30', colors.primary + '10'] 
              : [colors.error + '30', colors.error + '10']}
          style={[styles.resultContainer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={[styles.resultEmoji]}>
            {winner === 'draw' ? '🤝' : winner === walletAddress ? '🎉' : '😔'}
          </Text>
          <Text style={[styles.resultText, { 
            color: winner === 'draw' 
              ? colors.text 
              : winner === walletAddress 
                ? colors.primary 
                : colors.error 
          }]}>
            {winner === 'draw' 
              ? "It's a Draw!" 
              : winner === walletAddress 
                ? 'Victory!' 
                : 'Defeated'}
          </Text>
          {winner !== 'draw' && (
            <Text style={[styles.wagerResult, { 
              color: winner === walletAddress ? colors.primary : colors.error 
            }]}>
              {winner === walletAddress ? '+' : '-'}{wager} ALLY
            </Text>
          )}
        </LinearGradient>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 20,
  },
  statusContainer: {
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
  boardContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(67, 233, 123, 0.6)',
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  boardBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  board: {
    padding: 2,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: CELL_SIZE * 0.5,
    fontFamily: Fonts.bold,
    lineHeight: CELL_SIZE * 0.6,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  hintText: {
    fontSize: CELL_SIZE * 0.4,
    fontFamily: Fonts.bold,
  },
  resultContainer: {
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  resultEmoji: {
    fontSize: 40,
  },
  resultText: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    letterSpacing: -0.5,
  },
  wagerResult: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.2,
  },
});