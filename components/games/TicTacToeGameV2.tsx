import React, { useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
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

export default function TicTacToeGameV2({
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
  
  // Initialize board with empty array if undefined
  const gameBoard = board || [[null, null, null], [null, null, null], [null, null, null]];
  
  const animatedValues = useRef(
    gameBoard.map(row => row.map(() => new Animated.Value(0)))
  ).current;

  const isPlayer1 = walletAddress?.toLowerCase() === player1?.toLowerCase();
  const currentSymbol = currentPlayer?.toLowerCase() === player1?.toLowerCase() ? 'X' : 'O';
  const mySymbol = isPlayer1 ? 'X' : 'O';

  const handleCellPress = (row: number, col: number) => {
    if (!isMyTurn || gameBoard[row][col] || winner || !player2) {
      if (!player2) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Animate the cell
    Animated.sequence([
      Animated.timing(animatedValues[row][col], {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    onMove(row, col);
  };

  const getCellContent = (value: string | null, row: number, col: number) => {
    if (!value) return null;

    const scale = animatedValues[row][col];
    const isWinningCell = checkWinningCell(row, col);

    return (
      <Animated.View
        style={[
          styles.cellContent,
          {
            transform: [{ scale }],
          },
        ]}
      >
        <Text
          style={[
            styles.cellText,
            {
              color: value === 'X' ? colors.primary : colors.secondary,
              fontSize: 60,
              textShadowColor: value === 'X' ? colors.primary : colors.secondary,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: isWinningCell ? 20 : 10,
            },
          ]}
        >
          {value}
        </Text>
      </Animated.View>
    );
  };

  const checkWinningCell = (row: number, col: number): boolean => {
    if (!winner || winner === 'draw') return false;

    // Check row
    if (gameBoard[row][0] === gameBoard[row][1] && gameBoard[row][1] === gameBoard[row][2] && gameBoard[row][0] !== null) {
      return true;
    }

    // Check column
    if (gameBoard[0][col] === gameBoard[1][col] && gameBoard[1][col] === gameBoard[2][col] && gameBoard[0][col] !== null) {
      return true;
    }

    // Check diagonals
    if (row === col && gameBoard[0][0] === gameBoard[1][1] && gameBoard[1][1] === gameBoard[2][2] && gameBoard[0][0] !== null) {
      return true;
    }
    if (row + col === 2 && gameBoard[0][2] === gameBoard[1][1] && gameBoard[1][1] === gameBoard[2][0] && gameBoard[0][2] !== null) {
      return true;
    }

    return false;
  };

  return (
    <View style={styles.container}>
      {/* Turn Indicator */}
      {!winner && player2 && (
        <View style={styles.turnIndicator}>
          <View style={[styles.turnCard, { 
            backgroundColor: isMyTurn ? colors.primary + '20' : colors.surface + '40'
          }]}>
            <Text style={[styles.turnText, { 
              color: isMyTurn ? colors.primary : colors.textSecondary 
            }]}>
              {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
            </Text>
            <View style={[styles.symbolIndicator, {
              backgroundColor: currentSymbol === 'X' ? colors.primary + '30' : colors.secondary + '30'
            }]}>
              <Text style={[styles.symbolText, {
                color: currentSymbol === 'X' ? colors.primary : colors.secondary
              }]}>
                {currentSymbol}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Game Board */}
      <View style={[styles.board, { backgroundColor: colors.surface + '20' }]}>
        <LinearGradient
          colors={[colors.primary + '10', colors.secondary + '10']}
          style={styles.boardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {gameBoard.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((cell, colIndex) => (
                <TouchableOpacity
                  key={`${rowIndex}-${colIndex}`}
                  style={[
                    styles.cell,
                    {
                      borderRightWidth: colIndex < 2 ? 2 : 0,
                      borderBottomWidth: rowIndex < 2 ? 2 : 0,
                      borderColor: colors.border + '40',
                      backgroundColor: cell ? 'transparent' : colors.surface + '10',
                    },
                  ]}
                  onPress={() => handleCellPress(rowIndex, colIndex)}
                  activeOpacity={0.7}
                  disabled={!!cell || !isMyTurn || !!winner || !player2}
                >
                  {getCellContent(cell, rowIndex, colIndex)}
                  {!cell && isMyTurn && !winner && player2 && (
                    <View style={[styles.hintOverlay, { backgroundColor: colors.primary + '05' }]}>
                      <Text style={[styles.hintText, { color: colors.primary + '30' }]}>
                        {mySymbol}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </LinearGradient>
      </View>

      {/* Game Result */}
      {winner && (
        <View style={styles.resultContainer}>
          <LinearGradient
            colors={
              winner === 'draw' 
                ? [colors.textSecondary + '20', colors.textSecondary + '10']
                : winner === walletAddress 
                  ? gradients.success 
                  : gradients.error
            }
            style={styles.resultGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.resultText, { 
              color: winner === 'draw' ? colors.text : '#fff' 
            }]}>
              {winner === 'draw' 
                ? "It's a Draw!" 
                : winner === walletAddress 
                  ? '🎉 You Won!' 
                  : 'You Lost'}
            </Text>
            {winner !== 'draw' && (
              <Text style={[styles.resultSubtext, { color: '#fff' }]}>
                {winner === walletAddress ? '+' : '-'}{wager} ALLY
              </Text>
            )}
          </LinearGradient>
        </View>
      )}

      {/* Waiting for opponent */}
      {!player2 && (
        <View style={styles.waitingOverlay}>
          <View style={[styles.waitingCard, { backgroundColor: colors.warning + '20' }]}>
            <Text style={[styles.waitingText, { color: colors.warning }]}>
              Waiting for opponent to join...
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  turnIndicator: {
    alignItems: 'center',
  },
  turnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 12,
  },
  turnText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
  },
  symbolIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolText: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
  },
  board: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  boardGradient: {
    padding: 4,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cellContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontFamily: Fonts.bold,
    lineHeight: 70,
  },
  hintOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    fontSize: 50,
    fontFamily: Fonts.bold,
  },
  resultContainer: {
    marginTop: 10,
  },
  resultGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  resultText: {
    fontSize: FontSizes['2xl'],
    fontFamily: Fonts.bold,
    letterSpacing: -0.5,
  },
  resultSubtext: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
    marginTop: 4,
  },
  waitingOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -20 }],
  },
  waitingCard: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  waitingText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
  },
});