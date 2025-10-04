'use client';

import { useWallet } from '@solana/wallet-adapter-react';

export default function RightSidebar() {
  const { connected } = useWallet();

  if (!connected) return null;

  const recentActivities = [
    {
      id: 1,
      type: 'game',
      title: 'Tic Tac Toe',
      wager: '25 SOL',
      players: '1/2',
      timeLeft: '4m',
      status: 'waiting',
      timestamp: Date.now() - 60000 // 1 min ago
    },
    {
      id: 2,
      type: 'event',
      title: 'DeFi Protocol Whitelist',
      project: 'SolanaSwap',
      time: '2h',
      participants: 234,
      maxParticipants: 500,
      category: 'whitelist',
      chain: 'Solana',
      premiumOnly: true,
      timestamp: Date.now() - 300000 // 5 min ago
    },
    {
      id: 3,
      type: 'game',
      title: 'Rock Paper Scissors',
      wager: '50 SOL',
      players: '0/2',
      timeLeft: '3m',
      status: 'waiting',
      timestamp: Date.now() - 720000 // 12 min ago
    },
    {
      id: 4,
      type: 'event',
      title: 'Cyber Punks NFT Mint',
      project: 'CyberPunks',
      time: '1d',
      participants: 567,
      maxParticipants: 1000,
      category: 'nft_mint',
      chain: 'Solana',
      price: '2 SOL',
      timestamp: Date.now() - 1440000 // 24 min ago
    },
    {
      id: 5,
      type: 'game',
      title: 'Connect Four',
      wager: '15 SOL',
      players: '1/2',
      timeLeft: '2m',
      status: 'waiting',
      timestamp: Date.now() - 1800000 // 30 min ago
    },
    {
      id: 6,
      type: 'event',
      title: 'Loyalty Rewards Airdrop',
      project: 'Korus',
      time: 'Live Now',
      participants: 1234,
      category: 'airdrop',
      chain: 'Solana',
      isLive: true,
      timestamp: Date.now() - 3600000 // 1 hr ago
    },
    {
      id: 7,
      type: 'game',
      title: 'Coin Flip',
      wager: '5 SOL',
      players: '0/2',
      timeLeft: '1m',
      status: 'waiting',
      timestamp: Date.now() - 7200000 // 2 hrs ago
    },
  ].sort((a, b) => b.timestamp - a.timestamp); // Sort by most recent first

  const getEventTypeIcon = (category: string) => {
    switch (category) {
      case 'whitelist': return '📋';
      case 'token_launch': return '🚀';
      case 'nft_mint': return '🖼️';
      case 'airdrop': return '🎁';
      case 'ido': return '📈';
      default: return '📅';
    }
  };

  const getEventTypeColor = (category: string) => {
    switch (category) {
      case 'whitelist': return 'text-purple-400';
      case 'token_launch': return 'text-cyan-400';
      case 'nft_mint': return 'text-pink-400';
      case 'airdrop': return 'text-yellow-400';
      case 'ido': return 'text-korus-primary';
      default: return 'text-blue-400';
    }
  };

  const getGameIcon = (title: string) => {
    switch (title.toLowerCase()) {
      case 'tic tac toe': return '⭕';
      case 'rock paper scissors': return '✂️';
      case 'connect four': return '🔴';
      case 'coin flip': return '🪙';
      default: return '🎮';
    }
  };

  const whoToFollow = [
    {
      username: 'solana_labs',
      name: 'Solana Labs',
      verified: true,
      followers: '2.1M',
    },
    {
      username: 'phantom',
      name: 'Phantom',
      verified: true,
      followers: '890K',
    },
    {
      username: 'magic_eden',
      name: 'Magic Eden',
      verified: true,
      followers: '654K',
    },
  ];

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-black border-l border-korus-border p-4 overflow-y-auto">
      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search Korus"
            className="w-full bg-gray-900 text-white pl-12 pr-4 py-3 rounded-full outline-none focus:ring-2 focus:ring-korus-primary focus:bg-gray-800 transition-colors"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mb-6">
        <h2 className="text-white text-xl font-bold mb-4 px-4">🎮 Recent Activity</h2>
        <div>
          {recentActivities.map((activity) => (
            <div key={activity.id} className="border-b border-korus-borderLight bg-korus-surface/20 backdrop-blur-sm mx-[-1rem] px-4 py-4 hover:bg-korus-surface/40 hover:border-korus-border transition-all duration-200 cursor-pointer group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {activity.type === 'game' ? getGameIcon(activity.title) : getEventTypeIcon(activity.category)}
                  </span>
                  <div className="text-white font-semibold">{activity.title}</div>
                  {activity.type === 'event' && activity.premiumOnly && (
                    <span className="text-xs bg-gradient-to-r from-korus-primary to-korus-secondary text-black px-2 py-0.5 rounded-full font-bold">
                      PREMIUM
                    </span>
                  )}
                </div>
                {activity.type === 'game' ? (
                  <div className="text-korus-primary text-sm font-medium">{activity.wager}</div>
                ) : (
                  <div className={`text-xs px-2 py-1 rounded-full font-medium ${getEventTypeColor(activity.category)} bg-opacity-20`} style={{backgroundColor: `${getEventTypeColor(activity.category).replace('text-', '')}20`}}>
                    {activity.category.replace('_', ' ').toUpperCase()}
                  </div>
                )}
              </div>

              {activity.type === 'event' && activity.project && (
                <div className="text-gray-400 text-xs mb-2">by {activity.project}</div>
              )}

              <div className="flex items-center justify-between text-sm mb-3">
                {activity.type === 'game' ? (
                  <>
                    <div className="text-gray-400">Players: {activity.players}</div>
                    <div className="text-orange-400">{activity.timeLeft} left</div>
                  </>
                ) : (
                  <>
                    <div className="text-gray-400">
                      {activity.maxParticipants
                        ? `${activity.participants}/${activity.maxParticipants} participants`
                        : `${activity.participants} participants`
                      }
                    </div>
                    <div className={activity.isLive ? "text-red-400 font-medium" : "text-orange-400"}>
                      {activity.isLive ? 'Live Now' : `in ${activity.time}`}
                    </div>
                  </>
                )}
              </div>

              {activity.type === 'event' && activity.chain && (
                <div className="text-xs text-gray-500 mb-2">
                  {activity.chain} • {activity.price && `${activity.price} •`}
                </div>
              )}

              <button className={`w-full text-sm font-bold py-1.5 rounded-lg transition-colors ${
                activity.type === 'game'
                  ? 'bg-korus-primary text-black hover:bg-korus-secondary'
                  : activity.isLive
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-korus-surface/40 border border-korus-borderLight text-korus-primary hover:bg-korus-surface/60 hover:border-korus-border'
              }`}>
                {activity.type === 'game'
                  ? 'Join Game'
                  : activity.isLive
                    ? 'Participate Now'
                    : 'Join Event'
                }
              </button>
            </div>
          ))}
        </div>
        <div className="px-4 pt-3">
          <button className="text-korus-primary text-sm hover:underline">
            View all activity
          </button>
        </div>
      </div>

      {/* Who to follow */}
      <div className="bg-gray-900 rounded-2xl p-4 mb-6">
        <h2 className="text-white text-xl font-bold mb-4">Who to follow</h2>
        <div className="space-y-4">
          {whoToFollow.map((user, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center">
                  <span className="text-black font-bold text-sm">
                    {user.username.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-white font-medium text-sm">{user.name}</span>
                    {user.verified && (
                      <svg className="w-4 h-4 text-korus-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    )}
                  </div>
                  <div className="text-gray-400 text-xs">@{user.username}</div>
                  <div className="text-gray-500 text-xs">{user.followers} followers</div>
                </div>
              </div>
              <button className="bg-white text-black font-medium px-4 py-1.5 rounded-full text-sm hover:bg-gray-200 transition-colors">
                Follow
              </button>
            </div>
          ))}
        </div>
        <button className="text-korus-primary text-sm mt-3 hover:underline">
          Show more
        </button>
      </div>

      {/* Recent Games */}
      <div className="bg-gray-900 rounded-2xl p-4">
        <h2 className="text-white text-xl font-bold mb-4">Recent Games</h2>
        <div className="space-y-3">
          <div className="hover:bg-gray-800 p-2 rounded-lg transition-colors cursor-pointer">
            <div className="text-white font-medium">Tic Tac Toe</div>
            <div className="text-gray-400 text-sm">12 games played today</div>
            <div className="text-korus-primary text-sm">Avg wager: 0.05 SOL</div>
          </div>
          <div className="hover:bg-gray-800 p-2 rounded-lg transition-colors cursor-pointer">
            <div className="text-white font-medium">Rock Paper Scissors</div>
            <div className="text-gray-400 text-sm">8 games played today</div>
            <div className="text-korus-primary text-sm">Avg wager: 0.1 SOL</div>
          </div>
          <div className="hover:bg-gray-800 p-2 rounded-lg transition-colors cursor-pointer">
            <div className="text-white font-medium">Coin Flip</div>
            <div className="text-gray-400 text-sm">25 games played today</div>
            <div className="text-korus-primary text-sm">Avg wager: 0.02 SOL</div>
          </div>
        </div>
        <button className="text-korus-primary text-sm mt-3 hover:underline">
          View all games
        </button>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-korus-border">
        <div className="flex flex-wrap gap-2 text-gray-500 text-xs">
          <a href="#" className="hover:underline">Terms of Service</a>
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">About</a>
          <a href="#" className="hover:underline">Help</a>
        </div>
        <div className="text-gray-500 text-xs mt-2">
          © 2024 Korus
        </div>
      </div>
    </div>
  );
}