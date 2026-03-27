'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletAuth } from '@/contexts/WalletAuthContext';
import { api } from '@/lib/api/client';
import Link from 'next/link';

const ADMIN_WALLETS = [
  'G4WAtEdLYWpDoxNWKVbd2Pv9LoX2feFSxN7mWUXt3kGG',
  '5S2AgyEURGvr4f4Lk3AJ6ei9U6RTzh2AthQiRwHWsV2L',
];

interface PlatformStats {
  users: { total: number; today: number; thisWeek: number; thisMonth: number };
  content: { totalPosts: number; postsToday: number; postsThisWeek: number; totalReplies: number };
  tips: { totalVolume: number; totalCount: number };
  games: { total: number };
  tiers: Record<string, number>;
  dailySignups: Array<{ date: string; count: number }>;
}

interface LeaderboardUser {
  walletAddress: string;
  username: string | null;
  displayName: string | null;
  snsUsername: string | null;
  tier: string;
  reputationScore: number;
  contentScore: number;
  engagementScore: number;
  communityScore: number;
  loyaltyScore: number;
  shoutoutScore: number;
  createdAt: string;
  lastLoginDate: string | null;
}

interface UserListItem {
  walletAddress: string;
  username: string | null;
  displayName: string | null;
  snsUsername: string | null;
  tier: string;
  reputationScore: number;
  isSuspended: boolean;
  createdAt: string;
  lastLoginDate: string | null;
  _count: { posts: number; replies: number };
}

interface TipEntry {
  wallet: string;
  username: string | null;
  totalSent?: number;
  totalReceived?: number;
  tipCount: number;
}

type Tab = 'overview' | 'reputation' | 'users' | 'tips';

export default function AdminDashboard() {
  const { publicKey } = useWallet();
  const { token } = useWalletAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [leaderboardTotal, setLeaderboardTotal] = useState(0);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [topTippers, setTopTippers] = useState<TipEntry[]>([]);
  const [topReceivers, setTopReceivers] = useState<TipEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const wallet = publicKey?.toBase58() || '';
  const isAdmin = ADMIN_WALLETS.includes(wallet);

  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get<{ success: boolean; stats: PlatformStats }>('/api/admin/stats', token);
      if (data.success) setStats(data.stats);
    } catch (e: any) {
      setError(e.message || 'Failed to load stats');
    }
  }, [token]);

  const loadLeaderboard = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get<{ success: boolean; users: LeaderboardUser[]; total: number }>(
        '/api/admin/reputation-leaderboard?limit=100', token
      );
      if (data.success) {
        setLeaderboard(data.users);
        setLeaderboardTotal(data.total);
      }
    } catch { /* silent */ }
  }, [token]);

  const loadUsers = useCallback(async (search = '') => {
    if (!token) return;
    try {
      const q = search ? `&search=${encodeURIComponent(search)}` : '';
      const data = await api.get<{ success: boolean; users: UserListItem[]; total: number }>(
        `/api/admin/users?limit=100${q}`, token
      );
      if (data.success) {
        setUsers(data.users);
        setUsersTotal(data.total);
      }
    } catch { /* silent */ }
  }, [token]);

  const loadTips = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get<{ success: boolean; topTippers: TipEntry[]; topReceivers: TipEntry[] }>(
        '/api/admin/tips-leaderboard?limit=50', token
      );
      if (data.success) {
        setTopTippers(data.topTippers);
        setTopReceivers(data.topReceivers);
      }
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => {
    if (!isAdmin || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([loadStats(), loadLeaderboard(), loadUsers(), loadTips()])
      .finally(() => setLoading(false));
  }, [isAdmin, token, loadStats, loadLeaderboard, loadUsers, loadTips]);

  // Search debounce
  useEffect(() => {
    if (!isAdmin || !token) return;
    const t = setTimeout(() => loadUsers(userSearch), 300);
    return () => clearTimeout(t);
  }, [userSearch, isAdmin, token, loadUsers]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--color-text-tertiary)] text-lg">Not authorized</p>
          <Link href="/" className="text-[var(--korus-primary)] text-sm mt-2 inline-block">Back to home</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--korus-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const displayName = (u: { username?: string | null; snsUsername?: string | null; displayName?: string | null; wallet?: string; walletAddress?: string }) => {
    return u.username || u.snsUsername || u.displayName || truncate((u as any).walletAddress || (u as any).wallet || '');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[var(--color-text)]">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
            </Link>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
          </div>
          <span className="text-[var(--color-text-tertiary)] text-xs">{truncate(wallet)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#1a1a1a]">
        <div className="max-w-7xl mx-auto flex">
          {([
            ['overview', 'Overview'],
            ['reputation', 'Reputation'],
            ['users', 'Users'],
            ['tips', 'Tips'],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'text-[var(--korus-primary)] border-[var(--korus-primary)]'
                  : 'text-[var(--color-text-tertiary)] border-transparent hover:text-[var(--color-text-secondary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6 text-red-400 text-sm">{error}</div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Users', value: stats.users.total, sub: `+${stats.users.today} today` },
                { label: 'Total Posts', value: stats.content.totalPosts, sub: `+${stats.content.postsToday} today` },
                { label: 'Total Replies', value: stats.content.totalReplies, sub: '' },
                { label: 'Tips Volume', value: `${stats.tips.totalVolume.toFixed(2)} SOL`, sub: `${stats.tips.totalCount} tips` },
                { label: 'Users This Week', value: stats.users.thisWeek, sub: '' },
                { label: 'Users This Month', value: stats.users.thisMonth, sub: '' },
                { label: 'Posts This Week', value: stats.content.postsThisWeek, sub: '' },
                { label: 'Total Games', value: stats.games.total, sub: '' },
              ].map((card, i) => (
                <div key={i} className="bg-[#111] border border-[#222] rounded-xl p-4">
                  <p className="text-[var(--color-text-tertiary)] text-xs mb-1">{card.label}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                  {card.sub && <p className="text-[var(--korus-primary)] text-xs mt-1">{card.sub}</p>}
                </div>
              ))}
            </div>

            {/* Tier Distribution */}
            <div className="bg-[#111] border border-[#222] rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-3">Tier Distribution</h3>
              <div className="flex gap-6">
                {Object.entries(stats.tiers).map(([tier, count]) => (
                  <div key={tier} className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${
                      tier === 'premium' ? 'bg-yellow-400' :
                      tier === 'vip' ? 'bg-purple-400' :
                      'bg-gray-400'
                    }`} />
                    <span className="text-sm capitalize">{tier}</span>
                    <span className="text-[var(--color-text-tertiary)] text-sm font-mono">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Signups Chart (simple bar) */}
            {stats.dailySignups.length > 0 && (
              <div className="bg-[#111] border border-[#222] rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-3">Daily Signups (Last 30 Days)</h3>
                <div className="flex items-end gap-1 h-32">
                  {stats.dailySignups.map((d, i) => {
                    const max = Math.max(...stats.dailySignups.map(x => x.count), 1);
                    const height = (d.count / max) * 100;
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-[var(--korus-primary)] rounded-t-sm hover:opacity-80 transition-opacity relative group"
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${new Date(d.date).toLocaleDateString()}: ${d.count}`}
                      >
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#222] text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                          {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {d.count}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reputation Tab */}
        {activeTab === 'reputation' && (
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#222] flex items-center justify-between">
              <h3 className="text-sm font-semibold">Reputation Leaderboard</h3>
              <span className="text-[var(--color-text-tertiary)] text-xs">{leaderboardTotal} total users</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[var(--color-text-tertiary)] text-xs border-b border-[#222]">
                    <th className="text-left px-4 py-3 font-medium">#</th>
                    <th className="text-left px-4 py-3 font-medium">User</th>
                    <th className="text-left px-4 py-3 font-medium">Wallet</th>
                    <th className="text-left px-4 py-3 font-medium">Tier</th>
                    <th className="text-right px-4 py-3 font-medium">Rep Score</th>
                    <th className="text-right px-4 py-3 font-medium">Content</th>
                    <th className="text-right px-4 py-3 font-medium">Engagement</th>
                    <th className="text-right px-4 py-3 font-medium">Community</th>
                    <th className="text-right px-4 py-3 font-medium">Shoutouts</th>
                    <th className="text-right px-4 py-3 font-medium">Loyalty</th>
                    <th className="text-left px-4 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((u, i) => (
                    <tr key={u.walletAddress} className="border-b border-[#1a1a1a] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-[var(--color-text-tertiary)]">{i + 1}</td>
                      <td className="px-4 py-3 font-medium">{displayName(u)}</td>
                      <td className="px-4 py-3 text-[var(--color-text-tertiary)] font-mono text-xs">{truncate(u.walletAddress)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          u.tier === 'premium' ? 'bg-yellow-400/20 text-yellow-400' :
                          u.tier === 'vip' ? 'bg-purple-400/20 text-purple-400' :
                          'bg-gray-400/20 text-gray-400'
                        }`}>{u.tier}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[var(--korus-primary)]">{u.reputationScore}</td>
                      <td className="px-4 py-3 text-right">{u.contentScore}</td>
                      <td className="px-4 py-3 text-right">{u.engagementScore}</td>
                      <td className="px-4 py-3 text-right">{u.communityScore}</td>
                      <td className="px-4 py-3 text-right">{u.shoutoutScore}</td>
                      <td className="px-4 py-3 text-right">{u.loyaltyScore}</td>
                      <td className="px-4 py-3 text-xs text-[var(--color-text-tertiary)]">
                        {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by username, wallet, or display name..."
                className="flex-1 bg-[#111] border border-[#222] rounded-lg px-4 py-2 text-sm text-[var(--color-text)] placeholder-[#555] outline-none focus:border-[var(--korus-primary)]/50"
              />
              <span className="text-[var(--color-text-tertiary)] text-xs">{usersTotal} users</span>
            </div>
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[var(--color-text-tertiary)] text-xs border-b border-[#222]">
                      <th className="text-left px-4 py-3 font-medium">User</th>
                      <th className="text-left px-4 py-3 font-medium">Wallet</th>
                      <th className="text-left px-4 py-3 font-medium">Tier</th>
                      <th className="text-right px-4 py-3 font-medium">Rep</th>
                      <th className="text-right px-4 py-3 font-medium">Posts</th>
                      <th className="text-right px-4 py-3 font-medium">Replies</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium">Joined</th>
                      <th className="text-left px-4 py-3 font-medium">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.walletAddress} className="border-b border-[#1a1a1a] hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-medium">{displayName(u)}</td>
                        <td className="px-4 py-3 text-[var(--color-text-tertiary)] font-mono text-xs">{truncate(u.walletAddress)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            u.tier === 'premium' ? 'bg-yellow-400/20 text-yellow-400' :
                            u.tier === 'vip' ? 'bg-purple-400/20 text-purple-400' :
                            'bg-gray-400/20 text-gray-400'
                          }`}>{u.tier}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[var(--korus-primary)]">{u.reputationScore}</td>
                        <td className="px-4 py-3 text-right">{u._count.posts}</td>
                        <td className="px-4 py-3 text-right">{u._count.replies}</td>
                        <td className="px-4 py-3">
                          {u.isSuspended ? (
                            <span className="text-red-400 text-xs">Suspended</span>
                          ) : (
                            <span className="text-green-400 text-xs">Active</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--color-text-tertiary)]">
                          {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--color-text-tertiary)]">
                          {u.lastLoginDate ? new Date(u.lastLoginDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tips Tab */}
        {activeTab === 'tips' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Top Tippers */}
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#222]">
                <h3 className="text-sm font-semibold">Top Tippers (Sent)</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[var(--color-text-tertiary)] text-xs border-b border-[#222]">
                    <th className="text-left px-4 py-2 font-medium">#</th>
                    <th className="text-left px-4 py-2 font-medium">User</th>
                    <th className="text-right px-4 py-2 font-medium">Total Sent</th>
                    <th className="text-right px-4 py-2 font-medium">Tips</th>
                  </tr>
                </thead>
                <tbody>
                  {topTippers.map((t, i) => (
                    <tr key={t.wallet} className="border-b border-[#1a1a1a]">
                      <td className="px-4 py-2 text-[var(--color-text-tertiary)]">{i + 1}</td>
                      <td className="px-4 py-2">{t.username || truncate(t.wallet)}</td>
                      <td className="px-4 py-2 text-right font-mono text-[var(--korus-primary)]">{(t.totalSent || 0).toFixed(3)} SOL</td>
                      <td className="px-4 py-2 text-right text-[var(--color-text-tertiary)]">{t.tipCount}</td>
                    </tr>
                  ))}
                  {topTippers.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-text-tertiary)]">No tips yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Top Receivers */}
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#222]">
                <h3 className="text-sm font-semibold">Top Receivers</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[var(--color-text-tertiary)] text-xs border-b border-[#222]">
                    <th className="text-left px-4 py-2 font-medium">#</th>
                    <th className="text-left px-4 py-2 font-medium">User</th>
                    <th className="text-right px-4 py-2 font-medium">Total Received</th>
                    <th className="text-right px-4 py-2 font-medium">Tips</th>
                  </tr>
                </thead>
                <tbody>
                  {topReceivers.map((t, i) => (
                    <tr key={t.wallet} className="border-b border-[#1a1a1a]">
                      <td className="px-4 py-2 text-[var(--color-text-tertiary)]">{i + 1}</td>
                      <td className="px-4 py-2">{t.username || truncate(t.wallet)}</td>
                      <td className="px-4 py-2 text-right font-mono text-[var(--korus-primary)]">{(t.totalReceived || 0).toFixed(3)} SOL</td>
                      <td className="px-4 py-2 text-right text-[var(--color-text-tertiary)]">{t.tipCount}</td>
                    </tr>
                  ))}
                  {topReceivers.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-text-tertiary)]">No tips yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
