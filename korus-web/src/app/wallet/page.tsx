'use client';

import dynamic from 'next/dynamic';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useToastContext } from '@/components/ToastProvider';
import { gamesAPI, UserGameHistory, UserGameStats } from '@/lib/api/games';

// Dynamically import modals
const SearchModal = dynamic(() => import('@/components/SearchModal'), { ssr: false });
const CreatePostModal = dynamic(() => import('@/components/CreatePostModal'), { ssr: false });
const MobileMenuModal = dynamic(() => import('@/components/MobileMenuModal'), { ssr: false });

interface ShoutoutTx {
  id: string;
  content: string;
  duration: number;
  price: number;
  txSignature: string | null;
  expiresAt: string | null;
  createdAt: string;
  status: 'queued' | 'active' | 'expired';
}

export default function WalletPage() {
  const { connected, publicKey } = useWallet();
  const { showError, showSuccess } = useToastContext();
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shoutouts, setShoutouts] = useState<ShoutoutTx[]>([]);
  const [shoutoutsLoading, setShoutoutsLoading] = useState(false);
  const [gameHistory, setGameHistory] = useState<UserGameHistory[]>([]);
  const [gameStats, setGameStats] = useState<UserGameStats | null>(null);
  const [gamesLoading, setGamesLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !connected) {
      router.push('/welcome');
    }
  }, [mounted, connected, router]);

  const fetchBalance = useCallback(async () => {
    if (!publicKey || !mounted) return;

    setLoading(true);
    setHasError(false);
    try {
      const rpcResponse = await fetch('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [publicKey.toBase58()],
        }),
      });
      const rpcData = await rpcResponse.json();
      if (rpcData.error) throw new Error(rpcData.error.message || 'RPC error');
      const bal = rpcData.result?.value ?? 0;
      setBalance(bal / LAMPORTS_PER_SOL);
      if (hasError) {
        showSuccess('Balance refreshed successfully');
      }
    } catch {
      setHasError(true);
      showError('Unable to fetch wallet balance. Please check your connection and try again.');
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [publicKey, mounted, hasError, showSuccess, showError]);

  const fetchShoutouts = useCallback(async () => {
    if (!publicKey || !mounted) return;
    setShoutoutsLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const res = await fetch(`${API_URL}/api/posts/shoutouts/${publicKey.toBase58()}`);
      const data = await res.json();
      if (data.success) {
        setShoutouts(data.shoutouts);
      }
    } catch {
      // Silently fail — shoutouts are supplementary
    } finally {
      setShoutoutsLoading(false);
    }
  }, [publicKey, mounted]);

  const fetchGames = useCallback(async () => {
    if (!publicKey || !mounted) return;
    setGamesLoading(true);
    try {
      const data = await gamesAPI.getGamesByUser(publicKey.toBase58());
      if (data.success) {
        setGameHistory(data.games);
        setGameStats(data.stats);
      }
    } catch {
      // Silently fail — games are supplementary
    } finally {
      setGamesLoading(false);
    }
  }, [publicKey, mounted]);

  useEffect(() => {
    if (mounted && connected && publicKey) {
      fetchBalance();
      fetchShoutouts();
      fetchGames();
    }
  }, [mounted, connected, publicKey, fetchBalance, fetchShoutouts, fetchGames]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const totalSpent = shoutouts.reduce((sum, s) => sum + s.price, 0);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <main className="min-h-screen bg-[var(--color-background)] relative overflow-hidden">
        <div className="relative z-10">
          <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
            <h2 className="text-3xl font-bold text-[var(--color-text)] mb-6">Wallet</h2>
            <div className="bg-white/[0.06] backdrop-blur-sm rounded-2xl p-6 mb-6 border border-[var(--color-border-light)]">
              <div className="text-[var(--color-text)] text-sm mb-2 font-medium">SOL Balance</div>
              <div className="text-4xl font-bold text-korus-primary animate-pulse mb-4">Loading...</div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-background)] relative overflow-hidden">
      {/* Standardized static background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[var(--color-background)] via-[var(--color-surface)] to-[var(--color-background)]">
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[var(--color-surface)]/25 to-[var(--color-surface)]/35" />
      </div>
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-gradient-to-br from-korus-primary/8 to-korus-secondary/6 rounded-full blur-[80px]" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-korus-secondary/6 to-korus-primary/8 rounded-full blur-[70px]" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-r from-korus-primary/4 to-korus-secondary/4 rounded-full blur-[60px]" />
      </div>

      <div className="relative z-10">
        <div className="flex min-h-screen max-w-[1280px] mx-auto">
          <LeftSidebar
            onNotificationsToggle={() => setShowNotifications(!showNotifications)}
            onPostButtonClick={() => setShowCreatePostModal(true)}
            onSearchClick={() => setShowSearchModal(true)}
          />

          <div className="flex-1 min-w-0 border-r border-[var(--color-border-light)]">
            {/* Header */}
            <div className="sticky top-0 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-[var(--color-border-light)] z-10 p-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="w-10 h-10 bg-white/[0.08] border border-[var(--color-border-light)] rounded-full flex items-center justify-center text-[var(--color-text)] font-bold hover:bg-white/[0.12] transition-all duration-150"
                >
                  ←
                </button>
                <h1 className="text-3xl font-bold text-[var(--color-text)]">Wallet</h1>
              </div>
            </div>

            <div className="p-6 pb-24">

          {/* Balance Card */}
          <div className="bg-white/[0.06] backdrop-blur-sm rounded-2xl p-6 mb-6 border border-[var(--color-border-light)] shadow-lg transition-shadow duration-150">
            <div className="text-[var(--color-text)] text-sm mb-2 font-medium">SOL Balance</div>
            <div className="text-4xl font-bold text-[var(--color-text)] mb-4">
              {loading ? (
                <span className="text-korus-primary animate-pulse">Loading...</span>
              ) : hasError ? (
                <div className="flex flex-col gap-2">
                  <span className="text-red-400">Unable to load balance</span>
                  <span className="text-[var(--color-text-secondary)] text-sm">
                    Check your connection or try again
                  </span>
                </div>
              ) : balance !== null ? (
                <span className="text-[var(--color-text)]">
                  {balance.toFixed(4)} SOL
                </span>
              ) : (
                <span className="text-[var(--color-text-secondary)]">--</span>
              )}
            </div>
            <div className="text-[var(--color-text)] text-xs font-mono bg-white/[0.12] rounded-lg p-2 mb-4">
              {publicKey?.toString().slice(0, 20)}...{publicKey?.toString().slice(-20)}
            </div>
            <button
              onClick={fetchBalance}
              disabled={loading}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-korus-primary to-korus-secondary font-semibold hover:shadow-[0_0_20px_var(--korus-primary)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: '#000000' }}
              aria-label={hasError ? 'Retry loading balance' : 'Refresh balance'}
            >
              {hasError ? 'Retry' : 'Refresh Balance'}
            </button>
          </div>

          {/* Activity Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {['All', 'Shoutouts', 'Tips', 'Games', 'Events'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-korus-primary to-korus-secondary'
                    : 'bg-white/[0.08] hover:bg-white/[0.12] border border-[var(--color-border-light)]'
                }`}
                style={activeTab === tab ? { color: '#000000' } : { color: 'var(--color-text)' }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white/[0.04] backdrop-blur-sm rounded-2xl border border-[var(--color-border-light)]">
            {activeTab === 'All' && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4 opacity-60">💳</div>
                <p className="text-[var(--color-text)] text-lg font-medium">No transactions yet</p>
                <p className="text-[var(--color-text-secondary)] text-sm mt-2 mb-6">
                  All your SOL transactions will appear here.<br/>
                  Start by exploring posts, games, and events to build activity.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => window.location.href = '/'}
                    className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-150"
                  >
                    Explore Posts
                  </button>
                  <button
                    onClick={() => window.location.href = '/games'}
                    className="bg-white/[0.06] border border-[var(--color-border-light)] text-[var(--color-text)] font-semibold px-6 py-3 rounded-xl hover:bg-white/[0.12] transition-all duration-150"
                  >
                    Play Games
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'Shoutouts' && (
              <div>
                {shoutoutsLoading ? (
                  <div className="text-center py-20">
                    <div className="text-korus-primary animate-pulse text-lg">Loading shoutouts...</div>
                  </div>
                ) : shoutouts.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4 opacity-60">📣</div>
                    <p className="text-[var(--color-text)] text-lg font-medium">No shoutouts yet</p>
                    <p className="text-[var(--color-text-secondary)] text-sm mt-2 mb-6">
                      Your shoutout purchases will appear here.<br/>
                      Create a shoutout to pin your message at the top of the feed!
                    </p>
                    <button
                      onClick={() => window.location.href = '/'}
                      className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-150"
                    >
                      Create Shoutout
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Summary */}
                    <div className="p-4 border-b border-[var(--color-border-light)]">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[var(--color-text-secondary)] text-sm">Total Shoutouts</span>
                          <p className="text-[var(--color-text)] text-xl font-bold">{shoutouts.length}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[var(--color-text-secondary)] text-sm">Total Spent</span>
                          <p className="text-korus-primary text-xl font-bold">{totalSpent.toFixed(2)} SOL</p>
                        </div>
                      </div>
                    </div>

                    {/* List */}
                    <div className="divide-y divide-[var(--color-border-light)]">
                      {shoutouts.map((s) => (
                        <div key={s.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">📣</span>
                                <span className="text-[var(--color-text)] font-medium truncate">{s.content}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                                <span>{formatDate(s.createdAt)} at {formatTime(s.createdAt)}</span>
                                <span>{s.duration}min</span>
                                {s.txSignature && (
                                  <a
                                    href={`https://solscan.io/tx/${s.txSignature}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-korus-primary hover:underline"
                                  >
                                    View Tx
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[var(--color-text)] font-semibold">{s.price} SOL</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                s.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                s.status === 'queued' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-white/[0.08] text-[var(--color-text-secondary)]'
                              }`}>
                                {s.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Tips' && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4 opacity-60">💰</div>
                <p className="text-[var(--color-text)] text-lg font-medium">No tips yet</p>
                <p className="text-[var(--color-text-secondary)] text-sm mt-2 mb-6">
                  Tips you send and receive will appear here.<br/>
                  Start engaging with quality content to earn tips!
                </p>
                <button
                  onClick={() => window.location.href = '/'}
                  className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-150"
                >
                  Find Great Content
                </button>
              </div>
            )}

            {activeTab === 'Games' && (
              <div>
                {gamesLoading ? (
                  <div className="text-center py-20">
                    <div className="text-korus-primary animate-pulse text-lg">Loading games...</div>
                  </div>
                ) : gameHistory.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4 opacity-60">🎮</div>
                    <p className="text-[var(--color-text)] text-lg font-medium">No game activity</p>
                    <p className="text-[var(--color-text-secondary)] text-sm mt-2 mb-6">
                      Your game winnings, losses, and rewards will appear here.<br/>
                      Join games to start earning SOL!
                    </p>
                    <button
                      onClick={() => window.location.href = '/games'}
                      className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-150"
                    >
                      Browse Games
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Stats Summary */}
                    {gameStats && (
                      <div className="p-4 border-b border-[var(--color-border-light)]">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <span className="text-[var(--color-text-secondary)] text-xs">Games</span>
                            <p className="text-[var(--color-text)] text-xl font-bold">{gameStats.totalGames}</p>
                          </div>
                          <div>
                            <span className="text-[var(--color-text-secondary)] text-xs">W / L / D</span>
                            <p className="text-[var(--color-text)] text-xl font-bold">
                              <span className="text-green-400">{gameStats.wins}</span>
                              {' / '}
                              <span className="text-red-400">{gameStats.losses}</span>
                              {' / '}
                              <span className="text-[var(--color-text-secondary)]">{gameStats.draws}</span>
                            </p>
                          </div>
                          <div>
                            <span className="text-[var(--color-text-secondary)] text-xs">Win Rate</span>
                            <p className="text-[var(--color-text)] text-xl font-bold">
                              {gameStats.totalGames > 0 ? Math.round((gameStats.wins / gameStats.totalGames) * 100) : 0}%
                            </p>
                          </div>
                          <div>
                            <span className="text-[var(--color-text-secondary)] text-xs">Net Earnings</span>
                            <p className={`text-xl font-bold ${parseFloat(gameStats.totalEarnings) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {parseFloat(gameStats.totalEarnings) >= 0 ? '+' : ''}{parseFloat(gameStats.totalEarnings).toFixed(4)} SOL
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Game List */}
                    <div className="divide-y divide-[var(--color-border-light)]">
                      {gameHistory.map((game) => {
                        const gameTypeLabel = game.gameType === 'tictactoe' ? 'Tic-Tac-Toe'
                          : game.gameType === 'rps' ? 'Rock Paper Scissors'
                          : game.gameType === 'connectfour' ? 'Connect Four'
                          : game.gameType;
                        const gameEmoji = game.gameType === 'tictactoe' ? '❌'
                          : game.gameType === 'rps' ? '✊'
                          : game.gameType === 'connectfour' ? '🔴'
                          : '🎮';
                        const resultColor = game.result === 'win' ? 'text-green-400'
                          : game.result === 'loss' ? 'text-red-400'
                          : game.result === 'draw' ? 'text-yellow-400'
                          : 'text-[var(--color-text-secondary)]';
                        const resultBg = game.result === 'win' ? 'bg-green-500/20'
                          : game.result === 'loss' ? 'bg-red-500/20'
                          : game.result === 'draw' ? 'bg-yellow-500/20'
                          : 'bg-white/[0.08]';
                        const opponentLabel = game.opponentDisplayName
                          || (game.opponentWallet ? `${game.opponentWallet.slice(0, 4)}...${game.opponentWallet.slice(-4)}` : 'N/A');

                        return (
                          <div key={game.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">{gameEmoji}</span>
                                  <span className="text-[var(--color-text)] font-medium">{gameTypeLabel}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase ${resultBg} ${resultColor}`}>
                                    {game.result}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                                  <span>vs {opponentLabel}</span>
                                  <span>{formatDate(game.createdAt)}</span>
                                  {game.payoutTxSig && (
                                    <a
                                      href={`https://solscan.io/tx/${game.payoutTxSig}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-korus-primary hover:underline"
                                    >
                                      View Tx
                                    </a>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[var(--color-text)] font-semibold">{game.wager} SOL</p>
                                <p className={`text-xs font-medium ${parseFloat(game.earnings) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {parseFloat(game.earnings) >= 0 ? '+' : ''}{game.earnings} SOL
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Events' && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4 opacity-60">🎪</div>
                <p className="text-[var(--color-text)] text-lg font-medium">No event activity</p>
                <p className="text-[var(--color-text-secondary)] text-sm mt-2 mb-6">
                  Event rewards, airdrops, and participation fees will appear here.<br/>
                  Join exclusive events to earn unique rewards!
                </p>
                <button
                  onClick={() => window.location.href = '/events'}
                  className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-150"
                >
                  View Events
                </button>
              </div>
            )}
          </div>
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
        onPostCreate={() => {
          showSuccess('Post created successfully!');
          setShowCreatePostModal(false);
        }}
      />

      {/* Mobile Menu Modal */}
      <MobileMenuModal
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
      />
    </main>
  );
}
