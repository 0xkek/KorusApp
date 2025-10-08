'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import Header from '@/components/Header';
import { useToast } from '@/hooks/useToast';

// Dynamically import modals
const SearchModal = dynamic(() => import('@/components/SearchModal'), { ssr: false });
const CreatePostModal = dynamic(() => import('@/components/CreatePostModal'), { ssr: false });

export default function GamesPage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'created' | 'active'>('created');
  const [showCreateGameModal, setShowCreateGameModal] = useState(false);
  const [newGame, setNewGame] = useState({
    type: 'tictactoe',
    wager: 0.1,
    timeLimit: '2h'
  });
  const [joinedGames, setJoinedGames] = useState<Set<number>>(new Set());
  const [joiningGame, setJoiningGame] = useState<number | null>(null);

  // Note: Removed redirect to allow viewing games without wallet connection
  // Users can still view games but won't be able to participate without connecting

  // Mock games data organized by status
  const gamesData = {
    created: [
      {
        id: 1,
        type: 'tictactoe',
        wager: 0.5,
        creator: 'tic_tac_pro',
        players: '1/2',
        timeLeft: '4h 23m',
        status: 'waiting'
      },
      {
        id: 2,
        type: 'rps',
        wager: 0.1,
        creator: 'rps_champion',
        players: '0/2',
        timeLeft: '2h 15m',
        status: 'waiting'
      },
      {
        id: 3,
        type: 'connect4',
        wager: 2.5,
        creator: 'connect4_master',
        players: '1/2',
        timeLeft: '6h 45m',
        status: 'waiting'
      },
      {
        id: 9,
        type: 'tictactoe',
        wager: 1.5,
        creator: 'tictac_master',
        players: '0/2',
        timeLeft: '8h 12m',
        status: 'waiting'
      },
      {
        id: 10,
        type: 'rps',
        wager: 0.3,
        creator: 'rock_master',
        players: '1/2',
        timeLeft: '3h 45m',
        status: 'waiting'
      }
    ],
    active: [
      {
        id: 5,
        type: 'connect4',
        wager: 1.0,
        creator: 'connect_master',
        opponent: 'strategy_king',
        players: '2/2',
        currentTurn: 'connect_master',
        timeLeft: '3h 12m',
        status: 'active',
        moves: 15
      },
      {
        id: 6,
        type: 'rps',
        wager: 0.5,
        creator: 'rock_dealer',
        opponent: 'paper_shark',
        players: '2/2',
        currentTurn: 'paper_shark',
        timeLeft: '45m',
        status: 'active'
      },
      {
        id: 11,
        type: 'tictactoe',
        wager: 0.2,
        creator: 'x_marks_spot',
        opponent: 'o_master',
        players: '2/2',
        currentTurn: 'o_master',
        timeLeft: '1h 20m',
        status: 'active'
      }
    ]
  };

  const getGameIcon = (gameType: string) => {
    switch (gameType) {
      case 'tictactoe': return '⭕';
      case 'rps': return '✂️';
      case 'connect4': return '🔴';
      default: return '🎮';
    }
  };

  const getGameColor = (gameType: string) => {
    switch (gameType) {
      case 'tictactoe': return 'text-blue-400';
      case 'rps': return 'text-purple-400';
      case 'connect4': return 'text-red-400';
      default: return 'text-korus-primary';
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

  const gameTypes = [
    { id: 'tictactoe', name: 'Tic Tac Toe', icon: '⭕', minWager: 0.1 },
    { id: 'rps', name: 'Rock Paper Scissors', icon: '✂️', minWager: 0.1 },
    { id: 'connect4', name: 'Connect Four', icon: '🔴', minWager: 0.1 }
  ];

  const timeLimits = [
    { value: '30m', label: '30 minutes' },
    { value: '1h', label: '1 hour' },
    { value: '2h', label: '2 hours' },
    { value: '4h', label: '4 hours' },
    { value: '8h', label: '8 hours' },
    { value: '24h', label: '24 hours' }
  ];

  const handleCreateGame = () => {
    if (!connected) {
      showError('Please connect your wallet to create a game');
      return;
    }

    // Here you would typically call an API to create the game
    console.log('Creating game:', newGame);

    // Reset form and close modal
    setNewGame({
      type: 'tictactoe',
      wager: 0.1,
      timeLimit: '2h'
    });
    setShowCreateGameModal(false);

    // Show success message
    showSuccess('Game created successfully!');
  };

  // Click handler for game actions
  const handleJoinGame = async (gameId: number) => {
    if (!connected) {
      showError('Please connect your wallet to join games');
      return;
    }

    setJoiningGame(gameId);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setJoinedGames(prev => {
        const newSet = new Set(prev);
        newSet.add(gameId);
        return newSet;
      });
      showSuccess('Joined game successfully!');
    } catch (error) {
      showError('Failed to join game. Please try again.');
    } finally {
      setJoiningGame(null);
    }
  };

  // Allow viewing games page even without wallet connection

  return (
    <main className="min-h-screen bg-korus-dark-100 relative overflow-hidden">
      {/* Standardized static background */}
      <div className="fixed inset-0 bg-gradient-to-br from-korus-dark-100 via-korus-dark-200 to-korus-dark-100">
        {/* Surface gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-korus-dark-300/25 to-korus-dark-200/35" />
      </div>
      {/* Static gradient orbs for visual depth */}
      <div className="fixed inset-0 overflow-hidden">
        {/* Primary gradient orb */}
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-gradient-to-br from-korus-primary/8 to-korus-secondary/6 rounded-full blur-[80px]" />
        {/* Secondary gradient orb */}
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-korus-secondary/6 to-korus-primary/8 rounded-full blur-[70px]" />
        {/* Accent orb for depth */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-r from-korus-primary/4 to-korus-secondary/4 rounded-full blur-[60px]" />
      </div>

      <div className="relative z-10">
        <div className="flex">
          <LeftSidebar
            onNotificationsToggle={() => setShowNotifications(!showNotifications)}
            onPostButtonClick={() => setShowCreatePostModal(true)}
            onSearchClick={() => setShowSearchModal(true)}
          />

          {/* Main Content */}
          <div className="flex-1 lg:ml-80 lg:mr-96 md:ml-64 md:mr-80 sm:ml-0 sm:mr-0 md:border-x md:border-korus-border bg-korus-surface/10 backdrop-blur-sm max-w-full overflow-hidden">

            {/* Header Navigation */}
            <div className="sticky top-0 bg-korus-dark-300/80 backdrop-blur-xl border-b border-korus-border z-10">
              <div className="flex">
                {/* Mobile menu button */}
                <button className="md:hidden flex items-center justify-center w-12 h-12 text-white hover:bg-korus-surface/20 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* Logo on mobile */}
                <div className="md:hidden flex items-center px-4">
                  <div className="w-6 h-6 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center">
                    <span className="text-black font-bold text-xs">K</span>
                  </div>
                </div>

                <div className="relative flex items-center justify-center w-full">
                  <button
                    onClick={() => router.push('/')}
                    className="relative px-4 py-4 text-korus-textSecondary font-semibold hover:bg-korus-surface/20 hover:text-white transition-colors group"
                  >
                    <span className="relative z-10">Home</span>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-transparent group-hover:bg-korus-primary/50 rounded-full transition-colors"></div>
                  </button>
                  <button
                    onClick={() => router.push('/games')}
                    className="relative px-4 py-4 text-white font-semibold hover:bg-korus-surface/20 transition-colors group"
                  >
                    <span className="relative z-10">Games</span>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-korus-primary rounded-full"></div>
                  </button>
                  <button
                    onClick={() => router.push('/events')}
                    className="relative px-4 py-4 text-korus-textSecondary font-semibold hover:bg-korus-surface/20 hover:text-white transition-colors group"
                  >
                    <span className="relative z-10">Events</span>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-transparent group-hover:bg-korus-primary/50 rounded-full transition-colors"></div>
                  </button>
                </div>

                {/* Mobile search/menu */}
                <button className="md:hidden flex items-center justify-center w-12 h-12 text-white hover:bg-korus-surface/20 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
              {/* Header Section */}
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h1 className="text-4xl font-bold mb-2 force-theme-text">
                    🎮 Games Hub
                  </h1>
                  <p className="text-korus-textSecondary">Join or create games</p>
                </div>
                <button
                  onClick={() => setShowCreateGameModal(true)}
                  className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-full hover:shadow-lg hover:shadow-korus-primary/20 transition-all"
                >
                  + Create Game
                </button>
              </div>

              {/* Game Tabs */}
              <div className="flex gap-2 mb-8">
                {(['created', 'active'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all capitalize ${
                      activeTab === tab
                        ? 'bg-gradient-to-r from-korus-primary to-korus-secondary text-black'
                        : 'bg-korus-surface/40 border border-korus-borderLight hover:bg-korus-surface/60'
                    }`}
                    style={activeTab === tab ? {} : { color: 'var(--color-text)' }}
                  >
                    {tab} Games ({gamesData[tab].length})
                  </button>
                ))}
              </div>

              {/* Game Posts */}
              <div className="space-y-0">
                {gamesData[activeTab].map((game) => (
                  <div
                    key={game.id}
                    className="border-b border-korus-borderLight bg-korus-surface/20 hover:bg-korus-surface/40 hover:border-korus-border transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex gap-4 p-6">
                      {/* Game Avatar/Icon */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center text-2xl flex-shrink-0">
                        {getGameIcon(game.type)}
                      </div>

                      {/* Game Content */}
                      <div className="flex-1 min-w-0">
                        {/* Game Header */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold force-theme-text capitalize">
                            {game.type.replace('-', ' ')}
                          </span>
                          <span className="text-korus-textSecondary">•</span>
                          <span className="text-korus-textSecondary">
                            💰 {game.wager} SOL
                          </span>
                          <span className="text-korus-textSecondary">•</span>
                          <span className="text-korus-textSecondary">
                            {activeTab === 'created' ? game.timeLeft :
                             activeTab === 'active' ? game.timeLeft :
                             game.endTime}
                          </span>
                          <div className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(game.status)} ml-auto`}>
                            {game.status}
                          </div>
                        </div>

                        {/* Game Description/Content */}
                        <div className="text-korus-text text-base leading-normal mb-3">
                          {activeTab === 'created' && (
                            <span>
                              <span className="font-semibold text-korus-primary">@{game.creator}</span> created a {game.type.replace('-', ' ')} game.
                              Players: <span className="font-semibold">{game.players}</span>
                            </span>
                          )}
                          {activeTab === 'active' && (
                            <span>
                              Game in progress between <span className="font-semibold text-korus-primary">@{game.creator}</span> and <span className="font-semibold text-korus-secondary">@{game.opponent}</span>.
                              Current turn: <span className="font-semibold text-green-400">@{game.currentTurn}</span>
                            </span>
                          )}
                        </div>

                        {/* Game Actions */}
                        <div className="flex items-center justify-end mt-3">
                          {/* Main Action Button */}
                          {activeTab === 'created' && game.players !== '2/2' && !joinedGames.has(game.id) && (
                            <button
                              onClick={() => handleJoinGame(game.id)}
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
                          {activeTab === 'created' && joinedGames.has(game.id) && (
                            <button
                              disabled
                              className="bg-green-600 text-white font-bold px-4 py-1.5 rounded-full text-sm opacity-80 cursor-not-allowed"
                            >
                              Joined ✓
                            </button>
                          )}

                          {activeTab === 'active' && (
                            <button className="bg-green-600 text-white font-bold px-4 py-1.5 rounded-full hover:bg-green-700 transition-all text-sm">
                              View Game
                            </button>
                          )}

                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Empty State */}
              {gamesData[activeTab].length === 0 && (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4 opacity-60">🎮</div>
                  <p className="text-korus-text text-lg font-medium">No {activeTab} games</p>
                  <p className="text-korus-textSecondary text-sm mt-2">
                    {activeTab === 'created' ? 'Create a game to get started!' : 'No games in progress'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <RightSidebar
            showNotifications={showNotifications}
            onNotificationsClose={() => setShowNotifications(false)}
          />
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        allPosts={[]}
      />

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onPostCreate={(post) => {
          showSuccess('Post created successfully!');
          setShowCreatePostModal(false);
        }}
      />

      {/* Create Game Modal */}
      {showCreateGameModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-korus-surface/90 backdrop-blur-md rounded-2xl p-8 max-w-md w-full border border-korus-borderLight">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold force-theme-text">Create New Game</h2>
              <button
                onClick={() => setShowCreateGameModal(false)}
                className="w-8 h-8 rounded-full bg-korus-surface/60 flex items-center justify-center hover:bg-korus-surface/80 transition-all"
              >
                <svg className="w-5 h-5 force-theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Game Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-korus-textSecondary mb-3">
                Game Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {gameTypes.map((gameType) => (
                  <button
                    key={gameType.id}
                    onClick={() => setNewGame(prev => ({
                      ...prev,
                      type: gameType.id,
                      wager: Math.max(prev.wager, gameType.minWager)
                    }))}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      newGame.type === gameType.id
                        ? 'border-korus-primary bg-korus-primary/10'
                        : 'border-korus-borderLight bg-korus-surface/40 hover:border-korus-border'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{gameType.icon}</span>
                      <div>
                        <div className={`font-semibold text-sm ${
                          newGame.type === gameType.id ? 'text-korus-primary' : 'force-theme-text'
                        }`}>
                          {gameType.name}
                        </div>
                        <div className="text-xs text-korus-textSecondary">
                          Min: {gameType.minWager} SOL
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Wager Amount */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-korus-textSecondary mb-2">
                Wager Amount (SOL)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={gameTypes.find(gt => gt.id === newGame.type)?.minWager || 0.05}
                  step="0.05"
                  value={newGame.wager}
                  onChange={(e) => setNewGame(prev => ({ ...prev, wager: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-korus-surface/60 border border-korus-borderLight rounded-xl px-4 py-3 force-theme-text focus:border-korus-primary focus:outline-none transition-all"
                  placeholder="0.1"
                />
                <div className="absolute right-12 top-1/2 transform -translate-y-1/2 text-korus-textSecondary text-sm pointer-events-none">
                  SOL
                </div>
              </div>
              <p className="text-xs text-korus-textSecondary mt-1">
                Minimum: {gameTypes.find(gt => gt.id === newGame.type)?.minWager} SOL
              </p>
            </div>

            {/* Time Limit */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-korus-textSecondary mb-2">
                Time Limit
              </label>
              <select
                value={newGame.timeLimit}
                onChange={(e) => setNewGame(prev => ({ ...prev, timeLimit: e.target.value }))}
                className="w-full bg-korus-surface/60 border border-korus-borderLight rounded-xl px-4 py-3 force-theme-text focus:border-korus-primary focus:outline-none transition-all"
              >
                {timeLimits.map((limit) => (
                  <option key={limit.value} value={limit.value} className="bg-korus-surface force-theme-text">
                    {limit.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateGameModal(false)}
                className="flex-1 bg-korus-surface/60 border border-korus-borderLight text-korus-text font-semibold py-3 rounded-xl hover:bg-korus-surface/80 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGame}
                disabled={!connected}
                className={`flex-1 font-bold py-3 rounded-xl transition-all ${
                  connected
                    ? 'bg-gradient-to-r from-korus-primary to-korus-secondary text-black hover:shadow-lg hover:shadow-korus-primary/20'
                    : 'bg-gray-600 text-korus-textSecondary cursor-not-allowed'
                }`}
              >
                {connected ? `Create Game (${newGame.wager} SOL)` : 'Connect Wallet'}
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
    </main>
  );
}