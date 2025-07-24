import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import { Post as PostType } from '../../types';
import { initialPosts } from '../../data/mockData';
import { useKorusAlert } from '../../components/KorusAlertProvider';
import TicTacToeGame from '../../components/games/TicTacToeGame';
import RockPaperScissorsGame from '../../components/games/RockPaperScissorsGame';
import ConnectFourGame from '../../components/games/ConnectFourGame';
import CoinFlipGame from '../../components/games/CoinFlipGameCompact';
import { Fonts, FontSizes } from '../../constants/Fonts';

export default function GameScreen() {
  try {
    const params = useLocalSearchParams();
    const id = params.id;
    const router = useRouter();
    const { colors, isDarkMode, gradients } = useTheme();
    const { walletAddress, balance } = useWallet();
    const { showAlert } = useKorusAlert();
    const insets = useSafeAreaInsets();
  
  const [post, setPost] = useState<PostType | null>(null);
  const currentUserWallet = walletAddress || 'loading...';
  
  // Add error boundary
  if (!id) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Invalid game ID</Text>
      </View>
    );
  }
  
  useEffect(() => {
    // Check regular posts first - ensure initialPosts is defined and is an array
    let foundPost = initialPosts && Array.isArray(initialPosts) ? initialPosts.find(p => p.id === Number(id)) : null;
    
    // If not found, create a sample game post for testing
    if (!foundPost && Number(id) >= 9997 && Number(id) <= 9999) {
      const sampleGames = {
        9999: {
          id: 9999,
          wallet: 'DeMo1K8tQpVHgLpQeN4eSkVHgfr6k6pVxZfO3syhUser',
          time: 'Just now',
          content: 'Looking for a Tic Tac Toe opponent!',
          likes: 0,
          replies: [],
          tips: 0,
          liked: false,
          bumped: false,
          category: 'GAMES',
          isPremium: true,
          userTheme: '#43e97b',
          gameData: {
            type: 'tictactoe' as const,
            wager: 25,
            player1: 'DeMo1K8tQpVHgLpQeN4eSkVHgfr6k6pVxZfO3syhUser',
            status: 'waiting' as const,
            createdAt: Date.now(),
            expiresAt: Date.now() + 300000, // 5 minutes
            board: [[null, null, null], [null, null, null], [null, null, null]]
          }
        },
        9998: {
          id: 9998,
          wallet: 'RpS2K8tQpVHgLpQeN4eSkVHgfr6k6pVxZfO3syhGamer',
          time: '2m ago',
          content: 'Rock Paper Scissors - Best of 3!',
          likes: 1,
          replies: [],
          tips: 0,
          liked: false,
          bumped: false,
          category: 'GAMES',
          isPremium: false,
          userTheme: '#FF6B6B',
          gameData: {
            type: 'rps' as const,
            wager: 50,
            player1: 'RpS2K8tQpVHgLpQeN4eSkVHgfr6k6pVxZfO3syhGamer',
            status: 'waiting' as const,
            createdAt: Date.now() - 120000,
            expiresAt: Date.now() + 300000, // 5 minutes
          }
        },
        9997: {
          id: 9997,
          wallet: 'C4nN3K8tQpVHgLpQeN4eSkVHgfr6k6pVxZfO3syhCon4',
          time: '5m ago',
          content: 'Connect Four challenge - get 4 in a row!',
          likes: 2,
          replies: [],
          tips: 0,
          liked: false,
          bumped: false,
          category: 'GAMES',
          isPremium: true,
          userTheme: '#4ECDC4',
          gameData: {
            type: 'connect4' as const,
            wager: 15,
            player1: 'C4nN3K8tQpVHgLpQeN4eSkVHgfr6k6pVxZfO3syhCon4',
            status: 'waiting' as const,
            createdAt: Date.now() - 300000,
            expiresAt: Date.now() + 300000, // 5 minutes
            board: Array(6).fill(null).map(() => Array(7).fill(null))
          }
        }
      };
      foundPost = sampleGames[Number(id) as keyof typeof sampleGames];
    }
    
    if (foundPost && foundPost.gameData) {
      setPost(foundPost);
    } else {
      showAlert({
        title: 'Error',
        message: 'Game not found',
        type: 'error'
      });
      router.back();
    }
  }, [id]);
  
  if (!post || !post.gameData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading game...</Text>
      </View>
    );
  }

  const gameData = post.gameData;
  
  // Ensure gameData has all required fields
  if (!gameData.board && gameData.type === 'tictactoe') {
    gameData.board = [[null, null, null], [null, null, null], [null, null, null]];
  }
  if (!gameData.rounds && gameData.type === 'rps') {
    gameData.rounds = [];
  }
  
  const isPlayer1 = gameData.player1?.toLowerCase() === currentUserWallet?.toLowerCase();
  const isPlayer2 = gameData.player2?.toLowerCase() === currentUserWallet?.toLowerCase();
  const isParticipant = isPlayer1 || isPlayer2;
  const isMyTurn = gameData.currentPlayer?.toLowerCase() === currentUserWallet?.toLowerCase();
  
  const getGameName = () => {
    switch (gameData.type) {
      case 'tictactoe': return 'Tic Tac Toe';
      case 'rps': return 'Rock Paper Scissors';
      case 'connect4': return 'Connect Four';
      case 'coinflip': return 'Coin Flip';
      default: return 'Game';
    }
  };

  // Handle joining a game
  const handleJoinGame = () => {
    if (!post || !gameData || gameData.player2) return;
    
    // Create updated game data with proper initialization
    const updatedGameData: any = {
      ...gameData,
      player2: currentUserWallet,
      status: 'active',
      currentPlayer: gameData.type === 'coinflip' ? currentUserWallet : gameData.player1
    };
    
    // Initialize game-specific data
    if (gameData.type === 'tictactoe' && !updatedGameData.board) {
      updatedGameData.board = [[null, null, null], [null, null, null], [null, null, null]];
    } else if (gameData.type === 'connect4' && !updatedGameData.board) {
      updatedGameData.board = Array(6).fill(null).map(() => Array(7).fill(null));
    } else if (gameData.type === 'rps') {
      updatedGameData.rounds = updatedGameData.rounds || [];
      updatedGameData.currentRound = updatedGameData.currentRound || 1;
    }
    
    // Simulate joining by updating local state
    setPost({
      ...post,
      gameData: updatedGameData
    });
    
    showAlert({
      title: 'Game Joined!',
      message: `You've joined the ${getGameName()} game with ${gameData.wager} ALLY wager.`,
      type: 'success'
    });
  };

  const handleGameMove = (moveData: any, moveType?: string) => {
    if (!post || !isMyTurn || gameData.status !== 'active') return;
    
    // Handle Connect Four moves
    if (gameData.type === 'connect4' && typeof moveData === 'number') {
      const col = moveData;
      const board = gameData.board ? gameData.board.map(row => [...row]) : Array(6).fill(null).map(() => Array(7).fill(null));
      const currentColor = gameData.currentPlayer?.toLowerCase() === gameData.player1?.toLowerCase() ? 'RED' : 'YELLOW';
      
      // Find the lowest empty row in the column
      let targetRow = -1;
      for (let row = 5; row >= 0; row--) {
        if (!board[row][col]) {
          targetRow = row;
          break;
        }
      }
      
      if (targetRow === -1) return; // Column is full
      
      board[targetRow][col] = currentColor;
      
      // Check for winner
      const checkConnectFourWinner = (board: any[][]) => {
        const checkLine = (row: number, col: number, deltaRow: number, deltaCol: number) => {
          const color = board[row][col];
          if (!color) return false;
          
          let count = 1;
          // Check forward direction
          for (let i = 1; i < 4; i++) {
            const newRow = row + deltaRow * i;
            const newCol = col + deltaCol * i;
            if (newRow >= 0 && newRow < 6 && newCol >= 0 && newCol < 7 && board[newRow][newCol] === color) {
              count++;
            } else break;
          }
          // Check backward direction
          for (let i = 1; i < 4; i++) {
            const newRow = row - deltaRow * i;
            const newCol = col - deltaCol * i;
            if (newRow >= 0 && newRow < 6 && newCol >= 0 && newCol < 7 && board[newRow][newCol] === color) {
              count++;
            } else break;
          }
          return count >= 4 ? color : false;
        };
        
        // Check all positions and directions
        for (let row = 0; row < 6; row++) {
          for (let col = 0; col < 7; col++) {
            if (board[row][col]) {
              // Horizontal, Vertical, Diagonal
              const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
              for (const [deltaRow, deltaCol] of directions) {
                const winner = checkLine(row, col, deltaRow, deltaCol);
                if (winner) {
                  return winner === 'RED' ? gameData.player1 : gameData.player2;
                }
              }
            }
          }
        }
        
        // Check for draw
        const isDraw = board.every(row => row.every(cell => cell !== null));
        if (isDraw) return 'draw';
        
        return null;
      };
      
      const winner = checkConnectFourWinner(board);
      
      setPost({
        ...post,
        gameData: {
          ...gameData,
          board,
          currentPlayer: winner ? gameData.currentPlayer : 
            (gameData.currentPlayer?.toLowerCase() === gameData.player1?.toLowerCase() 
              ? gameData.player2 
              : gameData.player1),
          winner,
          status: winner ? 'completed' : 'active'
        }
      });
    }
    
    // Handle TicTacToe moves
    else if (gameData.type === 'tictactoe' && typeof moveData === 'number' && typeof moveType === 'number') {
      const row = moveData;
      const col = moveType;
      const board = gameData.board ? gameData.board.map(row => [...row]) : [[null, null, null], [null, null, null], [null, null, null]];
      const currentSymbol = gameData.currentPlayer?.toLowerCase() === gameData.player1?.toLowerCase() ? 'X' : 'O';
      
      board[row][col] = currentSymbol;
      
      // Check for winner logic...
      const checkWinner = (board: any[][]) => {
        // Check rows, columns, and diagonals
        for (let i = 0; i < 3; i++) {
          if (board[i][0] && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
            return board[i][0] === 'X' ? gameData.player1 : gameData.player2;
          }
          if (board[0][i] && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
            return board[0][i] === 'X' ? gameData.player1 : gameData.player2;
          }
        }
        if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
          return board[0][0] === 'X' ? gameData.player1 : gameData.player2;
        }
        if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
          return board[0][2] === 'X' ? gameData.player1 : gameData.player2;
        }
        
        const isDraw = board.every(row => row.every(cell => cell !== null));
        if (isDraw) return 'draw';
        
        return null;
      };
      
      const winner = checkWinner(board);
      
      setPost({
        ...post,
        gameData: {
          ...gameData,
          board,
          currentPlayer: winner ? gameData.currentPlayer : 
            (gameData.currentPlayer?.toLowerCase() === gameData.player1?.toLowerCase() 
              ? gameData.player2 
              : gameData.player1),
          winner,
          status: winner ? 'completed' : 'active'
        }
      });
    }
    
    // Handle other game types...
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          presentation: 'card',
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal'
        }} 
      />
      
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Game Room Background */}
        <LinearGradient
          colors={gradients?.background || ['#000', '#111']}
          style={styles.baseBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {/* Minimal Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.surface + '60', colors.surface + '40']}
              style={styles.backButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Wager Badge */}
          <LinearGradient
            colors={gradients?.primary || ['#43e97b', '#2dd4bf']}
            style={styles.wagerBadgeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.wagerAmount}>{gameData.wager}</Text>
            <Text style={styles.wagerLabel}>ALLY</Text>
          </LinearGradient>
          
          {/* Timer/Status */}
          <View style={[styles.statusBadge, { backgroundColor: colors.surface + '60' }]}>
            {gameData.status === 'active' ? (
              <>
                <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.statusText, { color: colors.text }]}>LIVE</Text>
              </>
            ) : gameData.status === 'waiting' ? (
              <>
                <View style={[styles.statusDot, { backgroundColor: colors.warning }]} />
                <Text style={[styles.statusText, { color: colors.text }]}>WAITING</Text>
              </>
            ) : (
              <>
                <View style={[styles.statusDot, { backgroundColor: colors.textTertiary }]} />
                <Text style={[styles.statusText, { color: colors.text }]}>ENDED</Text>
              </>
            )}
          </View>
        </View>

        {/* Players Info */}
        {gameData.player1 && (
          <View style={styles.playersSection}>
            <View style={styles.playersContainer}>
              <View style={[styles.playerCard, { 
                backgroundColor: 'transparent',
                shadowColor: isPlayer1 ? colors.primary : 'transparent',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isPlayer1 ? 0.3 : 0,
                shadowRadius: 8,
                elevation: isPlayer1 ? 4 : 0,
              }]}>
                <LinearGradient
                  colors={isPlayer1 ? [colors.primary + '20', colors.primary + '10'] : [colors.surface + '40', colors.surface + '20']}
                  style={[styles.playerCardGradient, {
                    borderColor: isPlayer1 ? colors.primary : colors.border + '40',
                    borderWidth: 2,
                  }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={[styles.playerIndicator, { backgroundColor: colors.primary }]} />
                  <View style={styles.playerInfo}>
                    <Text style={[styles.playerLabel, { color: colors.textSecondary }]}>PLAYER 1</Text>
                    <Text style={[styles.playerAddress, { color: colors.text }]}>
                      {gameData.player1.slice(0, 6)}...{gameData.player1.slice(-4)}
                    </Text>
                  </View>
                  {isPlayer1 && (
                    <View style={[styles.youBadge, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.youText, { color: isDarkMode ? '#000' : '#fff' }]}>YOU</Text>
                    </View>
                  )}
                </LinearGradient>
              </View>

              <View style={styles.vsContainer}>
                <LinearGradient
                  colors={[colors.primary + '40', colors.secondary + '40']}
                  style={styles.vsGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={[styles.vsText, { color: colors.text }]}>VS</Text>
                </LinearGradient>
              </View>

              <View style={[styles.playerCard, { 
                backgroundColor: 'transparent',
                shadowColor: isPlayer2 ? colors.secondary : 'transparent',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isPlayer2 ? 0.3 : 0,
                shadowRadius: 8,
                elevation: isPlayer2 ? 4 : 0,
              }]}>
                <LinearGradient
                  colors={isPlayer2 ? [colors.secondary + '20', colors.secondary + '10'] : [colors.surface + '40', colors.surface + '20']}
                  style={[styles.playerCardGradient, {
                    borderColor: isPlayer2 ? colors.secondary : colors.border + '40',
                    borderWidth: 2,
                  }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={[styles.playerIndicator, { backgroundColor: colors.secondary }]} />
                  <View style={styles.playerInfo}>
                    <Text style={[styles.playerLabel, { color: colors.textSecondary }]}>PLAYER 2</Text>
                    {gameData.player2 ? (
                      <Text style={[styles.playerAddress, { color: colors.text }]}>
                        {gameData.player2.slice(0, 6)}...{gameData.player2.slice(-4)}
                      </Text>
                    ) : (
                      <Text style={[styles.waitingText, { color: colors.warning }]}>
                        Waiting for opponent...
                      </Text>
                    )}
                  </View>
                  {isPlayer2 && (
                    <View style={[styles.youBadge, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.youText, { color: isDarkMode ? '#000' : '#fff' }]}>YOU</Text>
                    </View>
                  )}
                </LinearGradient>
              </View>
            </View>
            
            {/* Game Status Info */}
            <View style={styles.gameStatusContainer}>
              <Text style={[styles.gameTitle, { color: colors.text }]}>{getGameName()}</Text>
              {gameData.status === 'active' && isMyTurn && (
                <View style={[styles.turnIndicator, { backgroundColor: colors.primary + '20' }]}>
                  <View style={[styles.turnDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.turnText, { color: colors.primary }]}>Your Turn</Text>
                </View>
              )}
              {gameData.status === 'active' && !isMyTurn && isParticipant && (
                <View style={[styles.turnIndicator, { backgroundColor: colors.surface }]}>
                  <View style={[styles.turnDot, { backgroundColor: colors.warning }]} />
                  <Text style={[styles.turnText, { color: colors.warning }]}>Opponent's Turn</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Game Content Container */}
        <View style={styles.gameWrapper}>
          <LinearGradient
            colors={gradients?.surface || ['#1a1a1a', '#2a2a2a']}
            style={[styles.gameGradient, { 
              borderColor: colors.primary + '60',
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
              elevation: 8,
            }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.gameContainer}>
          {gameData.type === 'tictactoe' && (
            <TicTacToeGame
              gameId={post.id.toString()}
              player1={gameData.player1}
              player2={gameData.player2 || null}
              currentPlayer={gameData.currentPlayer || gameData.player1}
              isMyTurn={isMyTurn}
              wager={gameData.wager}
              onMove={(row, col) => handleGameMove(row, col)}
              board={gameData.board || [[null, null, null], [null, null, null], [null, null, null]]}
              winner={gameData.winner as any}
              expiresAt={gameData.expiresAt}
            />
          )}
          
          {gameData.type === 'rps' && (
            <RockPaperScissorsGame
              key={`rps-${post.id}-${gameData.player2}`}
              gameId={post.id.toString()}
              player1={gameData.player1}
              player2={gameData.player2 || null}
              currentPlayer={gameData.currentPlayer || gameData.player1}
              isMyTurn={isMyTurn}
              wager={gameData.wager}
              onMove={(choice) => handleGameMove(choice, 'rps')}
              rounds={gameData.rounds || []}
              currentRound={gameData.currentRound || 1}
              winner={gameData.winner || null}
              expiresAt={gameData.expiresAt}
              gameStatus={gameData.status}
            />
          )}
          
          {gameData.type === 'connect4' && (
            <ConnectFourGame
              gameId={post.id.toString()}
              player1={gameData.player1}
              player2={gameData.player2 || null}
              currentPlayer={gameData.currentPlayer || gameData.player1}
              isMyTurn={isMyTurn}
              wager={gameData.wager}
              onMove={(col) => handleGameMove(col)}
              board={gameData.board || Array(6).fill(null).map(() => Array(7).fill(null))}
              winner={gameData.winner as any}
              expiresAt={gameData.expiresAt}
            />
          )}
          
          {gameData.type === 'coinflip' && (
            <CoinFlipGame
              key={`coin-${post.id}`}
              gameId={post.id.toString()}
              player1={gameData.player1}
              player2={gameData.player2 || null}
              wager={gameData.wager}
              onChoose={(choice) => handleGameMove(choice, 'coinflip')}
              player1Choice={gameData.player1Choice || null}
              player2Choice={gameData.player2Choice || null}
              result={gameData.result || null}
              winner={gameData.winner || null}
              expiresAt={gameData.expiresAt}
            />
          )}
            </View>
          </LinearGradient>
        </View>

        {/* Game Status Bar / Join Button */}
        {gameData.status === 'waiting' && !isParticipant && (
          <TouchableOpacity
            style={[styles.joinBar]}
            onPress={handleJoinGame}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={gradients?.primary || ['#43e97b', '#2dd4bf']}
              style={styles.joinBarGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[styles.joinText, { color: isDarkMode ? '#000' : '#fff' }]}>
                Join Game • {gameData.wager} ALLY
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        
        {gameData.status === 'completed' && (
          <View style={[styles.statusBar, { 
            backgroundColor: gameData.winner === currentUserWallet ? colors.success + '20' : colors.error + '20' 
          }]}>
            <Text style={[styles.statusText, { 
              color: gameData.winner === currentUserWallet ? colors.success : colors.error 
            }]}>
              {gameData.winner === 'draw' ? 'Game ended in a draw!' :
               gameData.winner === currentUserWallet ? 'You won! 🎉' : 'You lost. Better luck next time!'}
            </Text>
          </View>
        )}
      </View>
    </>
  );
  
  } catch (error) {
    console.error('=== ERROR IN GAMESCREEN ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    console.error('=== END ERROR ===');
    
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#fff', fontSize: 18, marginBottom: 10 }}>Debug Error Information</Text>
        <Text style={{ color: '#ff0000', fontSize: 14, textAlign: 'center', padding: 20 }}>
          {error.message || 'Unknown error'}
        </Text>
        <Text style={{ color: '#888', fontSize: 12, textAlign: 'center', padding: 10 }}>
          Check console for full details
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  baseBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  animatedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.6,
  },
  loadingText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  backButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wagerBadgeGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  wagerAmount: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: '#000',
  },
  wagerLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: '#000',
    opacity: 0.8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  gameWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 120, // Increased to make frame shorter
  },
  gameGradient: {
    borderRadius: 32,
    borderWidth: 3,
    overflow: 'hidden',
    flex: 1, // Make gradient fill available space
  },
  gameContainer: {
    padding: 20,
    paddingTop: 6,
    flex: 1, // Make container fill available space
  },
  statusBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  joinBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  joinBarGradient: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  joinText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  playersSection: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  playersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 10, // Add padding to prevent badge cutoff
  },
  playerCard: {
    borderRadius: 20,
    overflow: 'visible', // Changed to visible to prevent badge cutoff
    flex: 1,
    maxWidth: '42%',
    position: 'relative', // Ensure proper positioning context
  },
  playerCardGradient: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
    borderRadius: 20, // Match parent borderRadius
    overflow: 'hidden', // Ensure gradient respects border radius
  },
  playerInfo: {
    alignItems: 'center',
    gap: 4,
  },
  playerIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  playerLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  playerAddress: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.mono,
    fontWeight: '600',
  },
  waitingText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  youBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  youText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  vsContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  vsGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },
  gameStatusContainer: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 0,
  },
  gameTitle: {
    fontSize: FontSizes['3xl'],
    fontFamily: Fonts.bold,
    textAlign: 'center',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  turnIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  turnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  turnText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.5,
  },
});