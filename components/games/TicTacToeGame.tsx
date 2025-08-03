import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { Fonts, FontSizes } from '../../constants/Fonts';

type Player = 'X' | 'O' | null;
type Board = Player[][];

interface TicTacToeGameProps {
  gameId: string;
  player1: string;
  player2: string | null;
  currentPlayer: string;
  isMyTurn: boolean;
  wager: number;
  onMove: (row: number, col: number) => void;
  board: Board;
  winner: Player | 'draw' | null;
  expiresAt: number;
}

export default function TicTacToeGame({
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
}: TicTacToeGameProps) {
  const { colors, gradients, isDarkMode } = useTheme();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [pendingMove, setPendingMove] = useState<{ row: number; col: number } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Ensure board is always defined
  const gameBoard = board || [[null, null, null], [null, null, null], [null, null, null]];
  
  // Track which cells have been animated
  const [animatedCells, setAnimatedCells] = useState<Set<string>>(new Set());
  
  // Create animated values for new moves
  const animatedValues = React.useRef<{ [key: string]: Animated.Value }>({}).current;
  
  // Initialize animated values for cells that have values
  React.useEffect(() => {
    if (!gameBoard || !Array.isArray(gameBoard)) return;
    
    gameBoard.forEach((row, rowIndex) => {
      if (!row || !Array.isArray(row)) return;
      
      row.forEach((cell, colIndex) => {
        const key = `${rowIndex}-${colIndex}`;
        if (cell && !animatedCells.has(key)) {
          if (!animatedValues[key]) {
            animatedValues[key] = new Animated.Value(0);
          }
          // Animate the new move
          Animated.spring(animatedValues[key], {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 3
          }).start();
          setAnimatedCells(prev => new Set([...prev, key]));
        }
      });
    });
  }, [gameBoard, animatedCells, animatedValues]);

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

  const handleCellPress = (row: number, col: number) => {
    if (!gameBoard || !gameBoard[row] || !isMyTurn || gameBoard[row][col] || winner || !player2) {
      // Play error haptic if move is invalid
      if (gameBoard && gameBoard[row] && !gameBoard[row][col] && !winner && player2) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      return;
    }
    
    // Store the pending move and show confirmation modal
    setPendingMove({ row, col });
    setShowConfirmModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  const confirmMove = () => {
    if (pendingMove) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onMove(pendingMove.row, pendingMove.col);
      setPendingMove(null);
      setShowConfirmModal(false);
    }
  };
  
  const cancelMove = () => {
    setPendingMove(null);
    setShowConfirmModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getCellContent = (row: number, col: number) => {
    const value = gameBoard[row][col];
    const key = `${row}-${col}`;
    
    if (!value) return null;
    
    const animatedValue = animatedValues[key] || new Animated.Value(1);
    
    return (
      <Animated.View 
        style={[
          styles.cellContentContainer,
          {
            transform: [
              { 
                scale: animatedValue
              },
              {
                rotate: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg']
                })
              }
            ],
            opacity: animatedValue
          }
        ]}
      >
        <Text style={[
          styles.cellText,
          { 
            color: value === 'X' ? colors.primary : colors.secondary,
            textShadowColor: value === 'X' ? colors.primary : colors.secondary,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: isDarkMode ? 10 : 5
          }
        ]}>
          {value}
        </Text>
      </Animated.View>
    );
  };

  const getWinningLine = () => {
    if (!gameBoard || !Array.isArray(gameBoard)) return null;
    
    // Check rows
    for (let i = 0; i < 3; i++) {
      if (gameBoard[i] && gameBoard[i][0] && gameBoard[i][0] === gameBoard[i][1] && gameBoard[i][1] === gameBoard[i][2]) {
        return { type: 'row', index: i };
      }
    }
    
    // Check columns
    for (let i = 0; i < 3; i++) {
      if (gameBoard[0] && gameBoard[1] && gameBoard[2] && 
          gameBoard[0][i] && gameBoard[0][i] === gameBoard[1][i] && gameBoard[1][i] === gameBoard[2][i]) {
        return { type: 'col', index: i };
      }
    }
    
    // Check diagonals
    if (gameBoard[0] && gameBoard[1] && gameBoard[2] &&
        gameBoard[0][0] && gameBoard[0][0] === gameBoard[1][1] && gameBoard[1][1] === gameBoard[2][2]) {
      return { type: 'diag', index: 0 };
    }
    if (gameBoard[0] && gameBoard[1] && gameBoard[2] &&
        gameBoard[0][2] && gameBoard[0][2] === gameBoard[1][1] && gameBoard[1][1] === gameBoard[2][0]) {
      return { type: 'diag', index: 1 };
    }
    
    return null;
  };

  const renderWinningLine = () => {
    const line = getWinningLine();
    if (!line || !winner || winner === 'draw') return null;

    const getLineStyle = () => {
      const baseStyle = {
        position: 'absolute' as const,
        backgroundColor: colors.primary,
        height: 4,
        borderRadius: 2,
      };

      switch (line.type) {
        case 'row':
          return {
            ...baseStyle,
            top: `${16.67 + line.index * 33.33}%`,
            left: '5%',
            right: '5%',
          };
        case 'col':
          return {
            ...baseStyle,
            left: `${16.67 + line.index * 33.33}%`,
            top: '5%',
            bottom: '5%',
            width: 4,
          };
        case 'diag':
          return {
            ...baseStyle,
            top: '50%',
            left: '50%',
            width: '130%',
            transform: [
              { translateX: -65 },
              { translateY: -2 },
              { rotate: line.index === 0 ? '45deg' : '-45deg' }
            ],
          };
      }
    };

    return <View style={getLineStyle()} />;
  };

  return (
    <View style={styles.container}>
      {/* Game Header */}
      <View style={styles.header}>
        <View style={styles.playerInfo}>
          <Text style={[styles.playerName, { color: colors.text }]}>
            {player1.slice(0, 8)}... (X)
          </Text>
          <Text style={[styles.vs, { color: colors.textSecondary }]}>VS</Text>
          <Text style={[styles.playerName, { color: colors.text }]}>
            {player2 ? `${player2.slice(0, 8)}... (O)` : 'Waiting...'}
          </Text>
        </View>
        
        <View style={styles.gameInfo}>
          <View style={[styles.wagerBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.wagerText, { color: colors.primary }]}>
              💰 {wager} ALLY
            </Text>
          </View>
          
          <View style={[styles.timerBadge, { backgroundColor: colors.surface }]}>
            <Ionicons name="timer-outline" size={16} color={colors.textSecondary} />
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

      {player2 && !winner && (
        <View style={[styles.statusBar, { backgroundColor: isMyTurn ? colors.primary + '20' : colors.surface }]}>
          <Text style={[styles.statusText, { color: isMyTurn ? colors.primary : colors.textSecondary }]}>
            {isMyTurn ? "Your turn!" : "Opponent's turn..."}
          </Text>
        </View>
      )}

      {winner && (
        <LinearGradient
          colors={winner === 'draw' ? [colors.warning, colors.secondary] : gradients.primary}
          style={styles.winnerBar}
        >
          <Text style={styles.winnerText}>
            {winner === 'draw' ? '🤝 Draw!' : `🎉 ${winner} Wins!`}
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
        {renderWinningLine()}
        
        {gameBoard && Array.isArray(gameBoard) && gameBoard.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row && Array.isArray(row) && row.map((cell, colIndex) => (
              <TouchableOpacity
                key={`cell-${rowIndex}-${colIndex}-${cell || 'empty'}`}
                style={[
                  styles.cell,
                  { 
                    backgroundColor: cell ? colors.surface : colors.cardBackground,
                    borderColor: cell ? (gameBoard[rowIndex][colIndex] === 'X' ? colors.primary : colors.secondary) : colors.borderLight,
                    borderWidth: cell ? 3 : 2,
                  },
                  isMyTurn && !cell && !winner && player2 && styles.cellHoverable,
                  cell && styles.cellFilled
                ]}
                onPress={() => handleCellPress(rowIndex, colIndex)}
                disabled={!player2 || !isMyTurn || !!cell || !!winner}
                activeOpacity={0.7}
              >
                {getCellContent(rowIndex, colIndex)}
                {/* Add subtle hover effect for empty cells */}
                {!cell && isMyTurn && player2 && !winner && (
                  <View style={[
                    styles.cellHover,
                    { backgroundColor: colors.primary + '10' }
                  ]} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </LinearGradient>

      
      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelMove}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <LinearGradient
              colors={gradients.surface}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconContainer, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="grid" size={32} color={colors.primary} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Confirm Your Move
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Place {currentPlayer === player1 ? 'X' : 'O'} at position ({pendingMove?.row ? pendingMove.row + 1 : ''}, {pendingMove?.col ? pendingMove.col + 1 : ''})
                </Text>
                
                <View style={[styles.wagerInfo, { backgroundColor: colors.primary + '10' }]}>
                  <Text style={[styles.wagerLabel, { color: colors.textSecondary }]}>Wager Amount</Text>
                  <Text style={[styles.wagerAmount, { color: colors.primary }]}>{wager} ALLY</Text>
                </View>
              </View>
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight }]}
                  onPress={cancelMove}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={confirmMove}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={gradients.primary}
                    style={styles.confirmButtonGradient}
                  >
                    <Text style={[styles.modalButtonText, { color: isDarkMode ? '#000' : '#fff' }]}>
                      Confirm Move
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
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
    aspectRatio: 1,
    padding: 8,
    borderRadius: 16,
    position: 'relative',
    width: '100%',
    maxWidth: 400, // Limit max size
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    margin: 3,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    aspectRatio: 1, // Keep cells square
  },
  cellHoverable: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  cellFilled: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  cellHover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  cellContentContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 48,
    fontFamily: Fonts.bold,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalGradient: {
    padding: 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginBottom: 20,
  },
  wagerInfo: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  wagerLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    marginBottom: 4,
  },
  wagerAmount: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalCancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
  },
});