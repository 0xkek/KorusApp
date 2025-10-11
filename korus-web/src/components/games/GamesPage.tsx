'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { gamesAPI, type Game, type GameStatus, type GameType } from '@/lib/api/games';
import { useGameEscrow } from '@/hooks/useGameEscrow';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { useToast } from '@/hooks/useToast';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export function GamesPage() {
  const { connected, publicKey } = useWallet();
  const { createGame, joinGame, cancelGame, isProcessing } = useGameEscrow();
  const { isAuthenticated, authenticate, isAuthenticating } = useWalletAuth();
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<'waiting' | 'active'>('waiting');
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joiningGame, setJoiningGame] = useState<number | null>(null);
  const [cancellingGame, setCancellingGame] = useState<string | null>(null);
  const [newGame, setNewGame] = useState({
    type: 'tictactoe' as GameType,
    wager: 0,
    timeLimit: '2h'
  });

  // Authenticate with backend when wallet connects
  useEffect(() => {
    if (connected && !isAuthenticated && !isAuthenticating) {
      console.log('🔐 Wallet connected but not authenticated - triggering authentication');
      authenticate();
    }
  }, [connected, isAuthenticated, isAuthenticating, authenticate]);

  // Fetch games based on active tab
  useEffect(() => {
    loadGames();
  }, [activeTab]);

  const loadGames = async () => {
    setLoading(true);
    try {
      const response = await gamesAPI.getAllGames(activeTab);
      setGames(response.games);
    } catch (error) {
      console.error('Failed to load games:', error);
      showError('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

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
      loadGames();
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

    setCancellingGame(game.id);
    try {
      // If game has blockchain component, cancel on-chain first
      if (game.onChainGameId) {
        await cancelGame(Number(game.onChainGameId));
      }

      // Then delete from backend database
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (token) {
        await gamesAPI.deleteGame(game.id, token);
      }

      showSuccess('Game cancelled successfully!');
      loadGames();
    } catch (error) {
      console.error('Failed to cancel game:', error);
      showError(error instanceof Error ? error.message : 'Failed to cancel game');
    } finally {
      setCancellingGame(null);
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

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {(['waiting', 'active'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-lg font-semibold transition-all capitalize ${
              activeTab === tab
                ? 'bg-gradient-to-r from-korus-primary to-korus-secondary text-black'
                : 'bg-korus-surface/40 border border-korus-border text-white hover:bg-korus-surface/60'
            }`}
          >
            {tab} Games ({games.length})
          </button>
        ))}
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
          <p className="text-white text-lg font-medium">No {activeTab} games</p>
          <p className="text-korus-textSecondary text-sm mt-2">
            {activeTab === 'waiting' ? 'Create a game to get started!' : 'No games in progress'}
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {games.map((game) => (
            <div
              key={game.id}
              className="border-b border-korus-border bg-korus-surface/20 hover:bg-korus-surface/40 hover:border-korus-primary/50 transition-all duration-200 cursor-pointer group"
            >
              <div className="flex gap-4 p-6">
                {/* Game Icon */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center text-2xl flex-shrink-0">
                  {getGameIcon(game.gameType)}
                </div>

                {/* Game Content */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-bold text-white capitalize">
                      {game.gameType.replace('_', ' ')}
                    </span>
                    <span className="text-korus-textSecondary">•</span>
                    <span className="text-korus-textSecondary">
                      💰 {game.wager} SOL
                    </span>
                    <span className="text-korus-textSecondary">•</span>
                    <span className="text-korus-textSecondary">
                      {formatTimeAgo(game.createdAt)}
                    </span>
                    <div className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(game.status)} ml-auto`}>
                      {game.status}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="text-gray-300 text-base leading-normal mb-3">
                    {activeTab === 'waiting' && (
                      <span>
                        <span className="font-semibold text-korus-primary">
                          {game.player1.slice(0, 4)}...{game.player1.slice(-4)}
                        </span> created a {game.gameType} game.
                        Players: <span className="font-semibold">{game.player2 ? '2/2' : '1/2'}</span>
                      </span>
                    )}
                    {activeTab === 'active' && game.player2 && (
                      <span>
                        Game in progress between{' '}
                        <span className="font-semibold text-korus-primary">
                          {game.player1.slice(0, 4)}...{game.player1.slice(-4)}
                        </span> and{' '}
                        <span className="font-semibold text-korus-secondary">
                          {game.player2.slice(0, 4)}...{game.player2.slice(-4)}
                        </span>
                        {game.currentTurn && (
                          <span>
                            {' • Current turn: '}
                            <span className="font-semibold text-green-400">
                              {game.currentTurn.slice(0, 4)}...{game.currentTurn.slice(-4)}
                            </span>
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end mt-3">
                    {activeTab === 'waiting' && !game.player2 && publicKey?.toBase58() !== game.player1 && (
                      <button
                        onClick={() => handleJoinGame(game)}
                        disabled={joiningGame === game.id}
                        className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-4 py-1.5 rounded-full hover:shadow-lg hover:shadow-korus-primary/20 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {joiningGame === game.id ? (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                            Joining...
                          </div>
                        ) : (
                          'Join Game'
                        )}
                      </button>
                    )}
                    {activeTab === 'waiting' && publicKey?.toBase58() === game.player1 && (
                      <div className="flex items-center gap-2">
                        <button
                          disabled
                          className="bg-blue-600 text-white font-bold px-4 py-1.5 rounded-full text-sm opacity-80 cursor-not-allowed"
                        >
                          Waiting for opponent
                        </button>
                        <button
                          onClick={() => handleCancelGame(game)}
                          disabled={cancellingGame === game.id}
                          className="bg-red-600 text-white font-bold px-4 py-1.5 rounded-full hover:bg-red-700 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {cancellingGame === game.id ? (
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                              Cancelling...
                            </div>
                          ) : (
                            'Cancel'
                          )}
                        </button>
                      </div>
                    )}
                    {activeTab === 'active' && (publicKey?.toBase58() === game.player1 || publicKey?.toBase58() === game.player2) && (
                      <button className="bg-green-600 text-white font-bold px-4 py-1.5 rounded-full hover:bg-green-700 transition-all text-sm">
                        Play Game
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Game Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-korus-surface/90 backdrop-blur-md border border-korus-border rounded-2xl p-8 max-w-md w-full">
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
                    Creating...
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
        </div>
      )}
    </div>
  );
}
