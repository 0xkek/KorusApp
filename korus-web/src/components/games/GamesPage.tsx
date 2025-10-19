'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { gamesAPI, type Game, type GameType } from '@/lib/api/games';
import { useGameEscrow } from '@/hooks/useGameEscrow';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { useToast } from '@/hooks/useToast';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TicTacToeBoard, type TicTacToeCell } from './TicTacToeBoard';
import { ConnectFourBoard, type ConnectFourCell } from './ConnectFourBoard';
import { RockPaperScissorsGame, type RPSMove } from './RockPaperScissorsGame';
import { GameCountdown } from './GameCountdown';

export function GamesPage() {
  const { connected, publicKey } = useWallet();
  const { createGame, joinGame, cancelGame, isProcessing } = useGameEscrow();
  const { isAuthenticated, authenticate, isAuthenticating } = useWalletAuth();
  const { showSuccess, showError } = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joiningGame, setJoiningGame] = useState<string | null>(null);
  const [cancellingGame, setCancellingGame] = useState<string | null>(null);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [previousGames, setPreviousGames] = useState<Game[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [gameToCancelData, setGameToCancelData] = useState<{ game: Game; wagerAmount: number; hasWager: boolean } | null>(null);
  const [cancelModalClosing, setCancelModalClosing] = useState(false);
  const [cancelStatus, setCancelStatus] = useState<string>('');
  const [newGame, setNewGame] = useState({
    type: 'tictactoe' as GameType,
    wager: 0,
    timeLimit: '2h'
  });

  const loadGames = useCallback(async () => {
    // Don't show loading spinner when polling for updates
    if (!expandedGameId) {
      setLoading(true);
    }
    try {
      // Fetch both waiting and active games
      const [waitingResponse, activeResponse] = await Promise.all([
        gamesAPI.getAllGames('waiting'),
        gamesAPI.getAllGames('active')
      ]);

      let gamesList = [...waitingResponse.games, ...activeResponse.games];

      // If we have an expanded game that's not in the list (e.g., just completed),
      // fetch it separately and add it to the list so it stays visible
      if (expandedGameId && !gamesList.find(g => g.id === expandedGameId)) {
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
          if (token) {
            const expandedGameResponse = await gamesAPI.getGame(expandedGameId, token);
            if (expandedGameResponse?.game) {
              gamesList = [expandedGameResponse.game, ...gamesList];
            }
          }
        } catch (err) {
          console.error('Failed to fetch expanded game:', err);
        }
      }

      setGames(gamesList);
    } catch (error) {
      console.error('Failed to load games:', error);
      showError('Failed to load games');
    } finally {
      if (!expandedGameId) {
        setLoading(false);
      }
    }
  }, [expandedGameId, showError]);

  // Fetch games based on active tab
  useEffect(() => {
    loadGames();
  }, [loadGames]);

  // Detect when games transition from waiting to active and notify player 1
  // Also detect when NEW games are created
  useEffect(() => {
    if (!publicKey) {
      setPreviousGames(games);
      return;
    }

    // Skip first load (when previousGames is empty)
    if (previousGames.length === 0) {
      setPreviousGames(games);
      return;
    }

    const userAddress = publicKey.toBase58();

    // Check for NEW games (games that weren't in previousGames)
    games.forEach(game => {
      const previousGame = previousGames.find(g => g.id === game.id);

      // NEW GAME: Not in previous list
      if (!previousGame && game.player1 !== userAddress) {
        showSuccess(`New ${game.gameType} game available! ${game.wager} SOL wager`);
      }

      // GAME STATE CHANGE: Game became active and user is player 1
      if (previousGame?.status === 'waiting' &&
          game.status === 'active' &&
          game.player1 === userAddress) {

        // Show notification
        showSuccess('Someone joined your game! Get ready to play!');

        // Auto-expand the game
        setExpandedGameId(game.id);
      }
    });

    setPreviousGames(games);
  }, [games, publicKey, previousGames, showSuccess]);

  // Auto-expand active games that the player is participating in (on first load)
  useEffect(() => {
    if (games.length > 0 && !expandedGameId && publicKey) {
      // Find the first active game where the user is a player
      const myActiveGame = games.find(
        game => game.status === 'active' && (game.player1 === publicKey.toBase58() || game.player2 === publicKey.toBase58())
      );
      if (myActiveGame) {
        setExpandedGameId(myActiveGame.id);
      }
    }
  }, [games, expandedGameId, publicKey]);

  // Poll for game updates every 5 seconds (always poll when connected)
  useEffect(() => {
    // Always poll if user is connected (to detect new games and updates)
    if (!connected) return;

    const interval = setInterval(() => {
      loadGames();
    }, 5000);

    return () => clearInterval(interval);
  }, [connected, loadGames]);

  const handleCreateGame = async () => {
    console.log('🎮 handleCreateGame called');
    console.log('  connected:', connected);
    console.log('  publicKey:', publicKey?.toBase58());
    console.log('  newGame:', newGame);

    if (!connected) {
      console.log('❌ Wallet not connected');
      showError('Please connect your wallet to create a game');
      return;
    }

    const wagerSol = newGame.wager;
    console.log('  wagerSol:', wagerSol);
    if (isNaN(wagerSol) || wagerSol < 0) {
      console.log('❌ Invalid wager amount');
      showError('Invalid wager amount');
      return;
    }

    try {
      let onChainGameId: number | undefined;

      // Only create blockchain game if there's a wager
      if (wagerSol > 0) {
        console.log('💰 Creating game with wager on blockchain...');
        const wagerLamports = Math.floor(wagerSol * LAMPORTS_PER_SOL);
        const result = await createGame(newGame.type, wagerLamports);
        onChainGameId = result.gameId;
        console.log('✅ Blockchain game created, ID:', onChainGameId);
      } else {
        console.log('ℹ️ No wager - skipping blockchain creation');
      }

      // Get auth token
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      console.log('  authToken exists:', !!token);
      if (!token) {
        console.log('❌ No auth token found');
        showError('Not authenticated. Please sign in with your wallet.');
        return;
      }

      // Create game in backend
      console.log('📤 Calling backend API...');
      const response = await gamesAPI.createGame(
        {
          postId: 0, // Standalone game not attached to a post
          gameType: newGame.type,
          wager: wagerSol,
          onChainGameId,
        },
        token
      );
      console.log('📥 Backend response:', response);

      if (response.success) {
        console.log('✅ Game created successfully!');
        showSuccess('Game created successfully!');
        setShowCreateModal(false);
        setNewGame({
          type: 'tictactoe',
          wager: 0,
          timeLimit: '2h'
        });
        loadGames(); // Reload games list
      } else {
        console.log('❌ Backend returned success:false');
        showError('Failed to create game in backend');
      }
    } catch (err) {
      console.error('❌ Failed to create game:', err);
      showError(err instanceof Error ? err.message : 'Failed to create game');
    }
  };

  const handleJoinGame = async (game: Game) => {
    if (!connected || !publicKey) {
      showError('Please connect your wallet to join games');
      return;
    }

    setJoiningGame(game.id);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (!token) {
        showError('Not authenticated. Please sign in with your wallet.');
        setJoiningGame(null);
        return;
      }

      // For wagered games, join on blockchain first
      if (game.wager && parseFloat(game.wager) > 0) {
        if (!game.onChainGameId) {
          showError('This game is not properly initialized on the blockchain');
          setJoiningGame(null);
          return;
        }

        console.log('💰 Wagered game - joining on blockchain first...');
        console.log('On-chain game ID:', game.onChainGameId);

        // Join game on blockchain (deposits wager into escrow)
        const { signature } = await joinGame(parseInt(game.onChainGameId));
        console.log('✅ Blockchain join successful:', signature);

        // Then update backend with signature
        await gamesAPI.joinGame(game.id, { onChainTxSignature: signature }, token);
      } else {
        // No wager - just join in backend
        await gamesAPI.joinGame(game.id, {}, token);
      }

      showSuccess('Joined game successfully!');

      // Expand the game to show the game board immediately
      setExpandedGameId(game.id);

      // Reload games to get updated state
      await loadGames();
    } catch (error) {
      console.error('Failed to join game:', error);
      showError(error instanceof Error ? error.message : 'Failed to join game. Please try again.');
    } finally {
      setJoiningGame(null);
    }
  };

  const handleCancelGame = async (game: Game) => {
    if (!connected || !publicKey) {
      showError('Please connect your wallet to cancel games');
      return;
    }

    // Show custom confirmation modal with wager info
    const wagerAmount = parseFloat(game.wager || '0');
    const hasWager = wagerAmount > 0;

    setGameToCancelData({ game, wagerAmount, hasWager });
    setCancelModalClosing(false);
    setCancelStatus('');
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    setCancelModalClosing(true);
    setTimeout(() => {
      setShowCancelModal(false);
      setCancelModalClosing(false);
      setGameToCancelData(null);
      setCancelStatus('');
    }, 200); // Match animation duration
  };

  const confirmCancelGame = async () => {
    if (!gameToCancelData) return;

    const { game, wagerAmount, hasWager } = gameToCancelData;

    setCancellingGame(game.id);
    try {
      console.log('🚫 Cancelling game:', game.id, 'On-chain ID:', game.onChainGameId);

      let signature: string | undefined;

      // If game has blockchain component, cancel on-chain first (refunds player1)
      if (game.onChainGameId) {
        setCancelStatus(hasWager ? `Refunding ${wagerAmount} SOL...` : 'Cancelling on blockchain...');
        console.log('💰 Cancelling on-chain and refunding', wagerAmount, 'SOL...');
        signature = await cancelGame(Number(game.onChainGameId));
        console.log('✅ On-chain cancellation successful:', signature);
      }

      // Then delete from backend database
      setCancelStatus('Updating database...');
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (token) {
        await gamesAPI.deleteGame(game.id, token);
      }

      // Close modal with animation
      closeCancelModal();

      // Show success message with refund info and transaction link
      if (hasWager && signature) {
        showSuccess(`Game cancelled! ${wagerAmount} SOL refunded to your wallet. View transaction: https://solscan.io/tx/${signature}?cluster=devnet`);
      } else {
        showSuccess('Game cancelled successfully!');
      }

      loadGames();
    } catch (error) {
      console.error('Failed to cancel game:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel game';

      // Close modal on error too
      closeCancelModal();

      // Provide more context if it's a blockchain error
      if (errorMessage.includes('simulation') || errorMessage.includes('Transaction')) {
        showError(`Failed to cancel on-chain: ${errorMessage}`);
      } else {
        showError(errorMessage);
      }
    } finally {
      setCancellingGame(null);
      setCancelStatus('');
    }
  };

  const handleMove = async (gameId: string, move: unknown) => {
    // Check if wallet is connected
    if (!connected || !publicKey) {
      showError('Please connect your wallet to play');
      return;
    }

    try {
      console.log('handleMove called:', { gameId, move });
      const token = localStorage.getItem('authToken');
      if (!token) {
        showError('Not authenticated. Please sign in with your wallet.');
        return;
      }
      console.log('Sending move to API...');
      const response = await gamesAPI.makeMove(gameId, { move }, token);
      console.log('Move API response:', response);
      console.log('Reloading games...');
      await loadGames(); // Reload to get updated state
      console.log('Games reloaded');
    } catch (error) {
      console.error('Failed to make move:', error);
      showError('Failed to make move');
    }
  };

  const getGameIcon = (gameType: string) => {
    switch (gameType) {
      case 'tictactoe': return '⭕';
      case 'rps': return '✊';
      case 'connectfour': return '🔴';
      default: return '🎮';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'border-yellow-400 bg-yellow-400/10 text-yellow-400';
      case 'active': return 'border-green-400 bg-green-400/10 text-green-400';
      case 'completed': return 'border-blue-400 bg-blue-400/10 text-blue-400';
      default: return 'border-gray-400 bg-gray-400/10 text-korus-textSecondary';
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diff = now.getTime() - created.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  // Render Tic Tac Toe
  const renderTicTacToe = (game: Game) => {
    // Handle both 1D (new) and 2D (old) array formats
    let board: TicTacToeCell[];
    const rawBoard = (game.gameState as { board?: unknown })?.board;

    if (!rawBoard) {
      board = Array(9).fill(null);
    } else if (Array.isArray((rawBoard as unknown[])[0])) {
      // Old 2D format - flatten it
      board = (rawBoard as unknown[][]).flat() as TicTacToeCell[];
    } else {
      // New 1D format
      board = rawBoard as TicTacToeCell[];
    }

    const isPlayer1 = publicKey?.toBase58() === game.player1;
    const playerSymbol: 'X' | 'O' = isPlayer1 ? 'X' : 'O';
    const isMyTurn = publicKey?.toBase58() === game.currentTurn;
    const isGameOver = game.status === 'completed' || game.status === 'cancelled';

    const handleCellClick = (index: number) => {
      handleMove(game.id, { index });
    };

    // Debug: log game data to check escrow
    console.log('Game data:', {
      id: game.id,
      status: game.status,
      escrow: game.escrow,
      payoutTxSig: game.escrow?.payoutTxSig
    });

    return (
      <TicTacToeBoard
        board={board}
        onCellClick={handleCellClick}
        isMyTurn={isMyTurn}
        isGameOver={isGameOver}
        winner={game.winner}
        playerSymbol={playerSymbol}
        player1Address={game.player1}
        player2Address={game.player2 || undefined}
        player1DisplayName={game.player1DisplayName}
        player2DisplayName={game.player2DisplayName}
        wager={game.wager?.toString()}
        gameCreatedAt={game.createdAt}
        currentPlayerAddress={publicKey?.toBase58()}
        payoutTxSignature={game.escrow?.payoutTxSig || undefined}
      />
    );
  };

  // Render Connect Four
  const renderConnectFour = (game: Game) => {
    const board: ConnectFourCell[][] = (game.gameState as { board?: ConnectFourCell[][] })?.board ||
      Array(6).fill(null).map(() => Array(7).fill(null));
    const isPlayer1 = publicKey?.toBase58() === game.player1;
    const playerColor: 'red' | 'yellow' = isPlayer1 ? 'red' : 'yellow';
    const isMyTurn = publicKey?.toBase58() === game.currentTurn;
    const isGameOver = game.status === 'completed' || game.status === 'cancelled';

    const handleColumnClick = (col: number) => {
      handleMove(game.id, { column: col });
    };

    return (
      <ConnectFourBoard
        board={board}
        onColumnClick={handleColumnClick}
        isMyTurn={isMyTurn}
        isGameOver={isGameOver}
        winner={game.winner}
        playerColor={playerColor}
      />
    );
  };

  // Helper to format display name (TODO: fetch from backend with user data)
  const getPlayerDisplayName = (address: string) => {
    // For now, just return truncated address
    // In the future, this should fetch username/SNS from backend
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Render Rock Paper Scissors
  const renderRPS = (game: Game) => {
    const playerMove = (game.gameState as { playerMoves?: Record<string, RPSMove> })?.playerMoves?.[publicKey?.toBase58() || ''] || null;
    const isPlayer1 = publicKey?.toBase58() === game.player1;
    const opponentAddress = isPlayer1 ? game.player2 : game.player1;
    const opponentMove = (game.gameState as { playerMoves?: Record<string, RPSMove> })?.playerMoves?.[opponentAddress || ''] || null;

    // For RPS, both players can make moves simultaneously (not turn-based)
    // A player can move if: game is active AND they haven't made a move this round
    const isGameActive = game.status === 'active';
    const isMyTurn = isGameActive && !playerMove; // Can move if active and haven't moved this round

    const isGameOver = game.status === 'completed' || game.status === 'cancelled';

    const handleMoveSelected = (move: RPSMove) => {
      handleMove(game.id, { choice: move });
    };

    // Convert wallet address winner to 'you'/'opponent'/'draw' format
    const getWinnerDisplayValue = () => {
      if (!game.winner) return null;
      if (game.winner === 'draw') return 'draw';
      if (game.winner === publicKey?.toBase58()) return 'you';
      return 'opponent';
    };

    return (
      <RockPaperScissorsGame
        onMoveSelected={handleMoveSelected}
        playerMove={playerMove}
        opponentMove={opponentMove}
        isMyTurn={isMyTurn}
        isGameOver={isGameOver}
        winner={getWinnerDisplayValue()}
        player1Address={game.player1}
        player2Address={game.player2 || undefined}
        player1DisplayName={getPlayerDisplayName(game.player1)}
        player2DisplayName={game.player2 ? getPlayerDisplayName(game.player2) : undefined}
        currentTurnAddress={game.currentTurn || undefined}
        gameCreatedAt={game.createdAt}
        wager={game.wager}
        gameState={game.gameState as { player1Score?: number; player2Score?: number; rounds?: unknown[]; round?: number; roundResults?: unknown[] }}
        payoutTxSignature={game.escrow?.payoutTxSig || undefined}
      />
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-white">
            🎮 Games Hub
          </h1>
          <p className="text-korus-textSecondary">Join or create games with SOL wagers</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-full hover:shadow-lg hover:shadow-korus-primary/20 transition-all"
        >
          + Create Game
        </button>
      </div>

      {/* Games List */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-4 border-korus-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-korus-textSecondary">Loading games...</p>
        </div>
      ) : games.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4 opacity-60">🎮</div>
          <p className="text-white text-lg font-medium">No games available</p>
          <p className="text-korus-textSecondary text-sm mt-2">
            Create a game to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {games.map((game) => (
            <div
              key={game.id}
              className="border-b border-korus-border bg-korus-surface/20"
            >
              <div className="flex items-center gap-3 p-3">
                {/* Game Icon */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center text-xl flex-shrink-0">
                  {getGameIcon(game.gameType)}
                </div>

                {/* Game Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Game info */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-white capitalize">
                        {game.gameType?.replace('_', ' ') || 'Game'}
                      </span>
                      <span className="text-korus-textSecondary">•</span>
                      <span className="text-korus-textSecondary">
                        💰 {game.wager} SOL
                      </span>
                      <span className="text-korus-textSecondary">•</span>
                      <span className="text-korus-textSecondary">
                        {formatTimeAgo(game.createdAt)}
                      </span>
                      {game.status === 'waiting' && game.expiresAt && (
                        <>
                          <span className="text-korus-textSecondary">•</span>
                          <GameCountdown
                            expiresAt={game.expiresAt}
                            onExpire={() => loadGames()}
                          />
                        </>
                      )}
                    </div>

                    {/* Right: Status + Action */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(game.status)}`}>
                        {game.status}
                      </div>

                      {game.status === 'waiting' && !game.player2 && publicKey?.toBase58() !== game.player1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinGame(game);
                          }}
                          disabled={joiningGame === game.id}
                          className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-3 py-1 rounded-full hover:shadow-lg hover:shadow-korus-primary/20 transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {joiningGame === game.id ? 'Joining...' : 'Join'}
                        </button>
                      )}
                      {game.status === 'waiting' && publicKey?.toBase58() === game.player1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelGame(game);
                          }}
                          disabled={cancellingGame === game.id}
                          className="bg-red-600 text-white font-bold px-3 py-1 rounded-full hover:bg-red-700 transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {cancellingGame === game.id ? (
                            parseFloat(game.wager || '0') > 0 ? 'Refunding...' : 'Cancelling...'
                          ) : 'Cancel'}
                        </button>
                      )}
                      {game.status === 'active' && (publicKey?.toBase58() === game.player1 || publicKey?.toBase58() === game.player2) && expandedGameId === game.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedGameId(null);
                          }}
                          className="bg-gray-600 text-white font-bold px-3 py-1 rounded-full hover:bg-gray-700 transition-all text-xs"
                        >
                          Collapse
                        </button>
                      )}
                      {game.status === 'active' && (publicKey?.toBase58() === game.player1 || publicKey?.toBase58() === game.player2) && expandedGameId !== game.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedGameId(game.id);
                          }}
                          className="bg-green-600 text-white font-bold px-3 py-1 rounded-full hover:bg-green-700 transition-all text-xs"
                        >
                          Play →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Inline Game Board */}
              {expandedGameId === game.id && (
                <div className="px-6 pb-3 bg-korus-cardBackground border-t border-korus-border">
                  <div className="py-3">
                    {game.gameType === 'tictactoe' && renderTicTacToe(game)}
                    {game.gameType === 'connectfour' && renderConnectFour(game)}
                    {game.gameType === 'rps' && renderRPS(game)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Game Modal - Rendered via Portal */}
      {showCreateModal && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-korus-surface/90 backdrop-blur-md border border-korus-border rounded-2xl p-8 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Create New Game</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={isProcessing}
                aria-label="Close modal"
                className="w-8 h-8 rounded-full bg-korus-surface flex items-center justify-center hover:bg-korus-surface/80 transition-all disabled:opacity-50"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Game Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-korus-textSecondary mb-3">
                Game Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'tictactoe', name: 'Tic Tac Toe', icon: '⭕❌' },
                  { id: 'rps', name: 'Rock Paper Scissors', icon: '✊📄✂️' },
                  { id: 'connectfour', name: 'Connect Four', icon: '🔴🟡' }
                ].map((gameType) => (
                  <button
                    key={gameType.id}
                    onClick={() => setNewGame(prev => ({
                      ...prev,
                      type: gameType.id as GameType
                    }))}
                    disabled={isProcessing}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      newGame.type === gameType.id
                        ? 'border-korus-primary bg-korus-primary/20 text-white'
                        : 'border-korus-border bg-korus-surface/60 text-korus-textSecondary hover:border-korus-primary/50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="text-2xl mb-1">{gameType.icon}</div>
                    <div className="text-xs">{gameType.name.replace(' ', '\n')}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Wager Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-korus-textSecondary mb-2">
                Wager (SOL)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newGame.wager}
                onChange={(e) => setNewGame(prev => ({ ...prev, wager: parseFloat(e.target.value) || 0 }))}
                disabled={isProcessing}
                className="w-full px-4 py-2 bg-korus-surface/60 border border-korus-border rounded-lg text-white focus:border-korus-primary focus:outline-none disabled:opacity-50"
                placeholder="0.1"
              />
              <p className="text-xs text-korus-textSecondary mt-1">
                Set to 0 for a friendly game (no blockchain escrow)
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={isProcessing}
                className="flex-1 bg-korus-surface border border-korus-border text-white font-semibold py-3 rounded-lg hover:bg-korus-surface/80 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGame}
                disabled={isProcessing || !connected}
                className={`flex-1 font-bold py-3 rounded-lg transition-all ${
                  isProcessing || !connected
                    ? 'bg-gradient-to-r from-korus-primary/50 to-korus-secondary/50 text-black/50 cursor-not-allowed'
                    : 'bg-gradient-to-r from-korus-primary to-korus-secondary text-black hover:shadow-lg hover:shadow-korus-primary/20 cursor-pointer'
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                    {newGame.wager > 0 ? 'Approve in wallet...' : 'Creating...'}
                  </div>
                ) : !connected ? (
                  'Wallet Not Connected'
                ) : (
                  `Create Game (${newGame.wager} SOL)`
                )}
              </button>
            </div>

            {!connected && (
              <p className="text-center text-korus-textSecondary text-sm mt-4">
                Connect your wallet to create games
              </p>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Cancel Confirmation Modal - Rendered via Portal */}
      {showCancelModal && gameToCancelData && typeof window !== 'undefined' && createPortal(
        <div
          className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity duration-200 ${
            cancelModalClosing ? 'opacity-0' : 'opacity-100'
          }`}
          onClick={cancellingGame ? undefined : closeCancelModal}
        >
          <div
            className={`bg-korus-surface/90 backdrop-blur-md border border-korus-border rounded-2xl p-8 max-w-md w-full transition-all duration-200 ${
              cancelModalClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Loading Overlay */}
            {cancellingGame && (
              <div className="absolute inset-0 bg-korus-surface/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-10">
                <div className="w-12 h-12 border-4 border-korus-primary/30 border-t-korus-primary rounded-full animate-spin mb-4"></div>
                <p className="text-white font-semibold text-lg">{cancelStatus}</p>
                <p className="text-korus-textSecondary text-sm mt-2">Please wait...</p>
              </div>
            )}

            {/* Modal Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Cancel Game</h2>
              <p className="text-korus-textSecondary text-sm">
                {gameToCancelData.hasWager
                  ? `Are you sure you want to cancel this game? Your wager of ${gameToCancelData.wagerAmount} SOL will be refunded to your wallet.`
                  : 'Are you sure you want to cancel this game?'}
              </p>
            </div>

            {/* Wager Info (if applicable) */}
            {gameToCancelData.hasWager && (
              <div className="mb-6 p-4 bg-korus-primary/10 border border-korus-primary/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-korus-textSecondary text-sm">Refund Amount</span>
                  <span className="text-korus-primary font-bold text-lg">
                    💰 {gameToCancelData.wagerAmount} SOL
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={closeCancelModal}
                disabled={!!cancellingGame}
                className="flex-1 bg-korus-surface border border-korus-border text-white font-semibold py-3 rounded-lg hover:bg-korus-surface/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Keep Game
              </button>
              <button
                onClick={confirmCancelGame}
                disabled={!!cancellingGame}
                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {gameToCancelData.hasWager ? `Cancel & Refund` : 'Cancel Game'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}