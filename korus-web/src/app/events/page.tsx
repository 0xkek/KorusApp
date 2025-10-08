'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import PremiumUpgradeModal from '@/components/PremiumUpgradeModal';
import { useToast } from '@/hooks/useToast';

interface Event {
  id: string;
  type: 'whitelist' | 'token_launch' | 'nft_mint' | 'airdrop' | 'ido';
  title: string;
  project: string;
  description: string;
  startTime: Date;
  endTime?: Date;
  imageUrl?: string;
  requirements?: string[];
  allocation?: string;
  price?: string;
  chain: 'Solana' | 'Ethereum' | 'Polygon';
  isLive?: boolean;
  participants?: number;
  maxParticipants?: number;
  premiumOnly?: boolean;
}

export default function EventsPage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [isParticipating, setIsParticipating] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Mock premium status - you can connect this to your actual premium logic
  const isPremium = false;

  // Mock events data
  const allEvents: Event[] = [
    {
      id: '1',
      type: 'whitelist',
      title: 'DeFi Protocol Whitelist',
      project: 'SolanaSwap',
      description: 'Get early access to the next-gen AMM on Solana. Limited spots available.',
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&q=80',
      requirements: ['Hold 1+ SOL', 'Complete KYC', 'Active Korus user'],
      allocation: '500 USDC',
      chain: 'Solana',
      participants: 234,
      maxParticipants: 500,
      premiumOnly: true,
    },
    {
      id: '2',
      type: 'nft_mint',
      title: 'Cyber Punks NFT Mint',
      project: 'CyberPunks',
      description: 'Exclusive NFT collection with utility in the Korus ecosystem.',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      imageUrl: 'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=400&q=80',
      price: '2 SOL',
      chain: 'Solana',
      maxParticipants: 1000,
      participants: 567,
    },
    {
      id: '3',
      type: 'token_launch',
      title: 'DEFI Token Public Sale',
      project: 'DeFiDAO',
      description: 'Governance token for the decentralized finance protocol.',
      startTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 days
      imageUrl: 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=400&q=80',
      price: '0.10 USDC',
      allocation: '1000 USDC',
      chain: 'Solana',
      isLive: false,
    },
    {
      id: '4',
      type: 'airdrop',
      title: 'Loyalty Rewards Airdrop',
      project: 'Korus',
      description: 'Exclusive airdrop for active Korus community members.',
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // Started 2 hours ago
      endTime: new Date(Date.now() + 22 * 60 * 60 * 1000), // Ends in 22 hours
      requirements: ['50+ posts', '100+ interactions', 'Connected wallet'],
      chain: 'Solana',
      isLive: true,
      participants: 1234,
    },
  ];

  // Filter events based on premium status
  const currentTime = new Date();
  const premiumTimeAdvantage = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

  const visibleEvents = allEvents.filter(event => {
    // Premium users see events 12 hours early (before start time)
    if (isPremium) {
      const premiumVisibleTime = new Date(event.startTime.getTime() - premiumTimeAdvantage);
      return currentTime >= premiumVisibleTime;
    }

    // Basic users only see events at start time or after
    return currentTime >= event.startTime;
  });

  const getEventTypeIcon = (type: Event['type']) => {
    switch (type) {
      case 'whitelist':
        return '📋';
      case 'token_launch':
        return '🚀';
      case 'nft_mint':
        return '🖼️';
      case 'airdrop':
        return '🎁';
      case 'ido':
        return '📈';
      default:
        return '📅';
    }
  };

  const getEventTypeColor = (type: Event['type']) => {
    switch (type) {
      case 'whitelist':
        return '#9945FF';
      case 'token_launch':
        return '#00D4FF';
      case 'nft_mint':
        return '#FF6B9D';
      case 'airdrop':
        return '#FFD700';
      case 'ido':
        return '#43e97b';
      default:
        return 'var(--color-primary)';
    }
  };

  const formatTimeRemaining = (startTime: Date) => {
    const now = new Date();
    const diff = startTime.getTime() - now.getTime();

    if (diff < 0) return 'Live Now';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }

    return `${hours}h ${minutes}m`;
  };

  const handleEventPress = (event: Event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleParticipate = () => {
    if (!selectedEvent || !connected) return;

    setIsParticipating(true);

    // Simulate transaction
    setTimeout(() => {
      setIsParticipating(false);
      setShowEventModal(false);
      showSuccess(`Success! You've successfully joined the ${selectedEvent.title}`);
    }, 2000);
  };

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
          <LeftSidebar onNotificationsToggle={() => setShowNotifications(!showNotifications)} />

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
                    className="relative px-4 py-4 text-korus-textSecondary font-semibold hover:bg-korus-surface/20 hover:text-white transition-colors group"
                  >
                    <span className="relative z-10">Games</span>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-transparent group-hover:bg-korus-primary/50 rounded-full transition-colors"></div>
                  </button>
                  <button
                    onClick={() => router.push('/events')}
                    className="relative px-4 py-4 text-white font-semibold hover:bg-korus-surface/20 transition-colors group"
                  >
                    <span className="relative z-10">Events</span>
                    <div className="absolute bottom-0 left-0 right-0 h-1 rounded-full transition-colors" style={{ backgroundColor: '#43E97B' }}></div>
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
                    📅 Community Events
                  </h1>
                  <p className="text-korus-textSecondary">Discover exclusive opportunities and participate in community events</p>
                  {isPremium && (
                    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black rounded-full text-sm font-semibold">
                      <span>⭐</span>
                      12h Early Access
                    </div>
                  )}
                </div>
              </div>

              {/* Premium Banner for Non-Premium Users */}
              {!isPremium && (
                <div className="mb-8 p-6 rounded-2xl" style={{
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)',
                  border: '1px solid rgba(251, 191, 36, 0.4)'
                }}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{
                      background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                    }}>
                      <span className="text-2xl">🔓</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold" style={{ color: '#fbbf24' }}>Get 12-Hour Early Access</h3>
                      <p className="text-korus-textSecondary">See events before everyone else with Premium</p>
                    </div>
                    <button
                      onClick={() => setShowPremiumModal(true)}
                      className="px-6 py-3 font-bold rounded-xl hover:shadow-lg transition-all"
                      style={{
                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                        color: '#000000'
                      }}
                    >
                      Upgrade
                    </button>
                  </div>
                </div>
              )}

              {/* Events Grid */}
              <div className="space-y-6">
                {visibleEvents.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4 opacity-60">📅</div>
                    <p className="text-korus-text text-lg font-medium">No events available</p>
                    <p className="text-korus-textSecondary text-sm mt-2">
                      {!isPremium ? 'Upgrade to Premium to see events 12 hours early' : 'Check back soon for new opportunities'}
                    </p>
                  </div>
                ) : (
                  visibleEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => handleEventPress(event)}
                      className="border border-korus-borderLight bg-korus-surface/20 hover:bg-korus-surface/40 hover:border-korus-border transition-all duration-200 cursor-pointer rounded-2xl overflow-hidden group"
                      style={{
                        borderColor: event.isLive ? getEventTypeColor(event.type) : undefined
                      }}
                    >
                      <div className="flex gap-6 p-6">
                        {/* Event Image */}
                        {event.imageUrl && (
                          <div className="w-32 h-24 rounded-xl overflow-hidden flex-shrink-0">
                            <img
                              src={event.imageUrl}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Event Content */}
                        <div className="flex-1 min-w-0">
                          {/* Event Header */}
                          <div className="flex items-center gap-4 mb-3">
                            <div
                              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold"
                              style={{
                                backgroundColor: getEventTypeColor(event.type) + '20',
                                color: getEventTypeColor(event.type)
                              }}
                            >
                              <span className="text-sm">{getEventTypeIcon(event.type)}</span>
                              {event.type.replace('_', ' ').toUpperCase()}
                            </div>

                            <div
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                                event.isLive
                                  ? 'bg-red-500 text-white'
                                  : 'bg-korus-surface text-korus-textSecondary'
                              }`}
                            >
                              {event.isLive ? '🔴' : '⏰'}
                              {formatTimeRemaining(event.startTime)}
                            </div>
                          </div>

                          <h3 className="text-xl font-bold force-theme-text mb-1">{event.title}</h3>
                          <p className="text-korus-primary font-medium text-sm mb-2">{event.project}</p>
                          <p className="text-korus-textSecondary text-sm leading-relaxed mb-4 line-clamp-2">
                            {event.description}
                          </p>

                          {/* Event Details */}
                          <div className="flex items-center gap-6 text-xs text-korus-textTertiary">
                            {event.price && (
                              <div className="flex items-center gap-1">
                                <span>💰</span>
                                {event.price}
                              </div>
                            )}

                            {event.allocation && (
                              <div className="flex items-center gap-1">
                                <span>💼</span>
                                Max: {event.allocation}
                              </div>
                            )}

                            <div className="flex items-center gap-1">
                              <span>🔗</span>
                              {event.chain}
                            </div>
                          </div>

                          {/* Participation Progress */}
                          {event.participants !== undefined && event.maxParticipants && (
                            <div className="mt-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-korus-textSecondary">
                                  {event.participants}/{event.maxParticipants} participants
                                </span>
                                <span className="text-xs font-medium" style={{ color: getEventTypeColor(event.type) }}>
                                  {Math.round((event.participants / event.maxParticipants) * 100)}%
                                </span>
                              </div>
                              <div className="w-full bg-korus-borderLight rounded-full h-2">
                                <div
                                  className="h-2 rounded-full transition-all"
                                  style={{
                                    backgroundColor: getEventTypeColor(event.type),
                                    width: `${(event.participants / event.maxParticipants) * 100}%`
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
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

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-korus-surface/90 backdrop-blur-md rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-korus-borderLight">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
                style={{
                  backgroundColor: getEventTypeColor(selectedEvent.type) + '20',
                  color: getEventTypeColor(selectedEvent.type)
                }}
              >
                <span className="text-lg">{getEventTypeIcon(selectedEvent.type)}</span>
                {selectedEvent.type.replace('_', ' ').toUpperCase()}
              </div>
              <button
                onClick={() => setShowEventModal(false)}
                className="w-8 h-8 rounded-full bg-korus-surface/60 flex items-center justify-center hover:bg-korus-surface/80 transition-all"
              >
                <svg className="w-5 h-5 force-theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Event Image */}
            {selectedEvent.imageUrl && (
              <img
                src={selectedEvent.imageUrl}
                alt={selectedEvent.title}
                className="w-full h-48 object-cover rounded-xl mb-6"
              />
            )}

            {/* Event Info */}
            <div>
              <h2 className="text-3xl font-bold force-theme-text mb-2">{selectedEvent.title}</h2>
              <p className="text-korus-primary font-medium text-lg mb-4">{selectedEvent.project}</p>
              <p className="text-korus-textSecondary leading-relaxed mb-6">
                {selectedEvent.description}
              </p>

              {/* Event Details Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-korus-surface/40 p-4 rounded-xl text-center">
                  <div className="text-korus-primary text-xl mb-1">⏰</div>
                  <div className="text-xs text-korus-textTertiary">Starts In</div>
                  <div className="font-bold force-theme-text">{formatTimeRemaining(selectedEvent.startTime)}</div>
                </div>

                {selectedEvent.price && (
                  <div className="bg-korus-surface/40 p-4 rounded-xl text-center">
                    <div className="text-korus-primary text-xl mb-1">💰</div>
                    <div className="text-xs text-korus-textTertiary">Price</div>
                    <div className="font-bold force-theme-text">{selectedEvent.price}</div>
                  </div>
                )}

                {selectedEvent.allocation && (
                  <div className="bg-korus-surface/40 p-4 rounded-xl text-center">
                    <div className="text-korus-primary text-xl mb-1">💼</div>
                    <div className="text-xs text-korus-textTertiary">Max Allocation</div>
                    <div className="font-bold force-theme-text">{selectedEvent.allocation}</div>
                  </div>
                )}

                <div className="bg-korus-surface/40 p-4 rounded-xl text-center">
                  <div className="text-korus-primary text-xl mb-1">🔗</div>
                  <div className="text-xs text-korus-textTertiary">Chain</div>
                  <div className="font-bold force-theme-text">{selectedEvent.chain}</div>
                </div>
              </div>

              {/* Requirements */}
              {selectedEvent.requirements && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold force-theme-text mb-3">Requirements</h3>
                  <div className="space-y-2">
                    {selectedEvent.requirements.map((req, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-korus-primary">✓</span>
                        <span className="text-korus-textSecondary text-sm">{req}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Participation Progress */}
              {selectedEvent.participants !== undefined && selectedEvent.maxParticipants && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold force-theme-text mb-3">Participation</h3>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-korus-textSecondary">
                      {selectedEvent.participants} / {selectedEvent.maxParticipants} spots filled
                    </span>
                    <span className="text-sm font-medium text-korus-primary">
                      {Math.round((selectedEvent.participants / selectedEvent.maxParticipants) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-korus-borderLight rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{
                        backgroundColor: getEventTypeColor(selectedEvent.type),
                        width: `${(selectedEvent.participants / selectedEvent.maxParticipants) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="mt-8">
                {!connected ? (
                  <button className="w-full bg-korus-surface/60 border border-korus-borderLight text-korus-textSecondary font-semibold py-4 rounded-xl">
                    Connect Wallet to Participate
                  </button>
                ) : (
                  <button
                    onClick={handleParticipate}
                    disabled={isParticipating}
                    className="w-full bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-korus-primary/20 transition-all disabled:opacity-50"
                  >
                    {isParticipating ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                        Processing...
                      </div>
                    ) : (
                      <>
                        Participate {selectedEvent.price && `- ${selectedEvent.price}`}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Upgrade Modal */}
      <PremiumUpgradeModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />
    </main>
  );
}