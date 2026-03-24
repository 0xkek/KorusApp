'use client';
import { logger } from '@/utils/logger';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import PremiumUpgradeModal from '@/components/PremiumUpgradeModal';
import { useToast } from '@/hooks/useToast';
import { useSubscription } from '@/hooks/useSubscription';
import { useWalletAuth } from '@/contexts/WalletAuthContext';
import * as eventsAPI from '@/lib/api/events';

// Dynamically import modals
const SearchModal = dynamic(() => import('@/components/SearchModal'), { ssr: false });
const CreatePostModal = dynamic(() => import('@/components/CreatePostModal'), { ssr: false });
const MobileMenuModal = dynamic(() => import('@/components/MobileMenuModal'), { ssr: false });

interface Event {
  id: string;
  type: 'whitelist' | 'token_launch' | 'nft_mint' | 'airdrop' | 'ido';
  title: string;
  projectName: string;
  description: string;
  startDate: string;
  endDate: string;
  imageUrl?: string;
  requirements?: string[];
  maxSpots?: number;
  registrationCount: number;
  status: 'active' | 'closed' | 'cancelled';
}

export default function EventsPage() {
  const { connected, publicKey } = useWallet();
  const { token } = useWalletAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const { isPremium, refreshStatus } = useSubscription();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [isParticipating, setIsParticipating] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch events on mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        const result = await eventsAPI.getEvents({ status: 'active' });
        setEvents(result.events);
      } catch (error) {
        logger.error('Failed to fetch events:', error);
        showError('Failed to load events');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [showError]);

  // Filter events based on premium status
  const currentTime = new Date();
  const premiumTimeAdvantage = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

  const visibleEvents = events.filter(event => {
    const eventStartTime = new Date(event.startDate);

    // Premium users see events 12 hours early (before start time)
    if (isPremium) {
      const premiumVisibleTime = new Date(eventStartTime.getTime() - premiumTimeAdvantage);
      return currentTime >= premiumVisibleTime;
    }

    // Basic users only see events at start time or after
    return currentTime >= eventStartTime;
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getEventTypeColor = (_type: Event['type']) => {
    // Use CSS variable for theme color (matches rest of the app)
    return 'var(--korus-primary)';
  };

  const formatTimeRemaining = (startDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const diff = start.getTime() - now.getTime();

    if (diff < 0) return 'Live Now';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }

    return `${hours}h ${minutes}m`;
  };

  const isEventLive = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return now >= start && now <= end;
  };

  const handleEventPress = (event: Event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleParticipate = async () => {
    if (!selectedEvent || !connected || !publicKey || !token) {
      showError('Please connect your wallet first');
      return;
    }

    // Check if wallet supports message signing
    const walletAdapter = (window as { solana?: { signMessage?: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array; publicKey: Uint8Array }> } }).solana;
    if (!walletAdapter || !walletAdapter.signMessage) {
      showError('Your wallet does not support message signing');
      return;
    }

    setIsParticipating(true);
    try {
      // Generate message for wallet signing
      const message = eventsAPI.generateSignatureMessage(selectedEvent.id, selectedEvent.projectName);
      const messageBytes = new TextEncoder().encode(message);

      // Request wallet signature
      const signatureResponse = await walletAdapter.signMessage(messageBytes, 'utf8');

      if (!signatureResponse || !signatureResponse.signature) {
        throw new Error('Failed to get signature from wallet');
      }

      // Import bs58 for encoding
      const bs58 = await import('bs58');

      // Convert signature to base58 (backend expects base58)
      const signatureUint8 = new Uint8Array(signatureResponse.signature);
      const signatureBase58 = bs58.default.encode(signatureUint8);

      // Register for whitelist
      const response = await eventsAPI.registerForWhitelist(
        selectedEvent.id,
        {
          signature: signatureBase58,
          signedMessage: message
        },
        token
      );

      setShowEventModal(false);
      showSuccess(response.message || `Successfully joined the ${selectedEvent.title}!`);

      // Refresh events to update registration count
      const result = await eventsAPI.getEvents({ status: 'active' });
      setEvents(result.events);
    } catch (error: unknown) {
      logger.error('Failed to register:', error);
      if ((error as Error).message?.includes('rejected') || (error as Error).message?.includes('User rejected')) {
        showError('You rejected the signature request');
      } else {
        showError((error as Error).message || 'Failed to register for whitelist');
      }
    } finally {
      setIsParticipating(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Standardized static background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0a0a0a]">
        {/* Surface gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#111111]/25 to-[#111111]/35" />
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
        <div className="flex min-h-screen max-w-[1280px] mx-auto">
          <LeftSidebar
            onNotificationsToggle={() => setShowNotifications(!showNotifications)}
            onPostButtonClick={() => setShowCreatePostModal(true)}
            onSearchClick={() => setShowSearchModal(true)}
          />

          {/* Main Content */}
          <div className="flex-1 min-w-0 border-x border-[#262626]">

            {/* Header Navigation */}
            <div className="sticky top-0 bg-[#141414]/80 backdrop-blur-xl border-b border-[#262626] z-10">
              <div className="flex">
                {/* Mobile menu button */}
                <button
                  onClick={() => setShowMobileMenu(true)}
                  aria-label="Open mobile menu"
                  className="md:hidden flex items-center justify-center w-12 h-12 text-white hover:bg-white/[0.04] transition-colors"
                >
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
                    className="relative px-4 py-4 text-[#a1a1a1] font-semibold hover:bg-white/[0.04] hover:text-white transition-colors group"
                  >
                    <span className="relative z-10">Home</span>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-transparent group-hover:bg-korus-primary/50 rounded-full transition-colors"></div>
                  </button>
                  <button
                    onClick={() => router.push('/games')}
                    className="relative px-4 py-4 text-[#a1a1a1] font-semibold hover:bg-white/[0.04] hover:text-white transition-colors group"
                  >
                    <span className="relative z-10">Games</span>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-transparent group-hover:bg-korus-primary/50 rounded-full transition-colors"></div>
                  </button>
                  <button
                    onClick={() => router.push('/events')}
                    className="relative px-4 py-4 text-white font-semibold hover:bg-white/[0.04] transition-colors group"
                  >
                    <span className="relative z-10">Events</span>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-korus-primary rounded-full transition-colors"></div>
                  </button>
                </div>

                {/* Mobile search/menu */}
                <button
                  onClick={() => setShowSearchModal(true)}
                  aria-label="Open search"
                  className="md:hidden flex items-center justify-center w-12 h-12 text-white hover:bg-white/[0.04] transition-colors"
                >
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
                  <h1 className="text-4xl font-semibold mb-2 text-[#fafafa]">
                    📅 Community Events
                  </h1>
                  <p className="text-[#a1a1a1]">Discover exclusive opportunities and participate in community events</p>
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
                      <h3 className="text-lg font-semibold" style={{ color: '#fbbf24' }}>Get 12-Hour Early Access</h3>
                      <p className="text-[#a1a1a1]">See events before everyone else with Premium</p>
                    </div>
                    <button
                      onClick={() => setShowPremiumModal(true)}
                      className="px-6 py-3 font-semibold rounded-lg hover:shadow-lg duration-150"
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
                {isLoading ? (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 mx-auto border-4 border-korus-primary/20 border-t-korus-primary rounded-full animate-spin mb-4"></div>
                    <p className="text-[#a1a1a1]">Loading events...</p>
                  </div>
                ) : visibleEvents.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4 opacity-60">📅</div>
                    <p className="text-[#fafafa] text-lg font-medium">No events available</p>
                    <p className="text-[#a1a1a1] text-sm mt-2">
                      {!isPremium ? 'Upgrade to Premium to see events 12 hours early' : 'Check back soon for new opportunities'}
                    </p>
                  </div>
                ) : (
                  visibleEvents.map((event) => {
                    const eventIsLive = isEventLive(event.startDate, event.endDate);
                    return (
                    <div
                      key={event.id}
                      onClick={() => handleEventPress(event)}
                      className="border border-[#262626] bg-[#141414] hover:bg-white/[0.04] hover:border-[#262626] transition-all duration-150 cursor-pointer rounded-xl overflow-hidden group"
                      style={{
                        borderColor: eventIsLive ? getEventTypeColor(event.type) : undefined
                      }}
                    >
                      <div className="flex gap-6 p-6">
                        {/* Event Image */}
                        {event.imageUrl && (
                          <div className="w-32 h-24 rounded-xl overflow-hidden flex-shrink-0">
                            <Image
                              src={event.imageUrl}
                              alt={event.title}
                              width={128}
                              height={96}
                              className="object-cover"
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
                                eventIsLive
                                  ? 'bg-red-500 text-white'
                                  : 'bg-[#141414] text-[#a1a1a1]'
                              }`}
                            >
                              {eventIsLive ? '🔴' : '⏰'}
                              {formatTimeRemaining(event.startDate)}
                            </div>
                          </div>

                          <h3 className="text-xl font-semibold text-[#fafafa] mb-1">{event.title}</h3>
                          <p className="text-korus-primary font-medium text-sm mb-2">{event.projectName}</p>
                          <p className="text-[#a1a1a1] text-sm leading-relaxed mb-4 line-clamp-2">
                            {event.description}
                          </p>

                          {/* Event Details */}
                          <div className="flex items-center gap-6 text-xs text-[#737373]">
                            <div className="flex items-center gap-1">
                              <span>🔗</span>
                              Solana
                            </div>
                            {event.maxSpots && (
                              <div className="flex items-center gap-1">
                                <span>👥</span>
                                Max: {event.maxSpots} spots
                              </div>
                            )}
                          </div>

                          {/* Participation Progress */}
                          {event.registrationCount !== undefined && event.maxSpots && (
                            <div className="mt-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-[#a1a1a1]">
                                  {event.registrationCount}/{event.maxSpots} participants
                                </span>
                                <span className="text-xs font-medium" style={{ color: getEventTypeColor(event.type) }}>
                                  {Math.round((event.registrationCount / event.maxSpots) * 100)}%
                                </span>
                              </div>
                              <div className="w-full bg-white/15 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full transition-all"
                                  style={{
                                    backgroundColor: getEventTypeColor(event.type),
                                    width: `${(event.registrationCount / event.maxSpots) * 100}%`
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })
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

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1e1e] border border-[#262626] rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                aria-label="Close event details"
                className="w-8 h-8 rounded-full bg-white/[0.12] flex items-center justify-center hover:bg-[#141414] transition-all"
              >
                <svg className="w-5 h-5 text-[#fafafa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Event Image */}
            {selectedEvent.imageUrl && (
              <Image
                src={selectedEvent.imageUrl}
                alt={selectedEvent.title}
                width={600}
                height={192}
                className="w-full object-cover rounded-xl mb-6"
              />
            )}

            {/* Event Info */}
            <div>
              <h2 className="text-3xl font-semibold text-[#fafafa] mb-2">{selectedEvent.title}</h2>
              <p className="text-korus-primary font-medium text-lg mb-4">{selectedEvent.projectName}</p>
              <p className="text-[#a1a1a1] leading-relaxed mb-6">
                {selectedEvent.description}
              </p>

              {/* Event Details Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#262626] p-4 rounded-xl text-center border border-[#262626]">
                  <div className="text-korus-primary text-xl mb-1">⏰</div>
                  <div className="text-xs text-[#737373]">Starts In</div>
                  <div className="font-semibold text-[#fafafa]">{formatTimeRemaining(selectedEvent.startDate)}</div>
                </div>

                {selectedEvent.maxSpots && (
                  <div className="bg-[#262626] p-4 rounded-xl text-center border border-[#262626]">
                    <div className="text-korus-primary text-xl mb-1">👥</div>
                    <div className="text-xs text-[#737373]">Max Spots</div>
                    <div className="font-semibold text-[#fafafa]">{selectedEvent.maxSpots}</div>
                  </div>
                )}

                <div className="bg-[#262626] p-4 rounded-xl text-center border border-[#262626]">
                  <div className="text-korus-primary text-xl mb-1">🔗</div>
                  <div className="text-xs text-[#737373]">Chain</div>
                  <div className="font-semibold text-[#fafafa]">Solana</div>
                </div>
              </div>

              {/* Requirements */}
              {selectedEvent.requirements && selectedEvent.requirements.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[#fafafa] mb-3">Requirements</h3>
                  <div className="space-y-2">
                    {selectedEvent.requirements.map((req, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-korus-primary">✓</span>
                        <span className="text-[#a1a1a1] text-sm">{req}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Participation Progress */}
              {selectedEvent.registrationCount !== undefined && selectedEvent.maxSpots && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[#fafafa] mb-3">Participation</h3>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-[#a1a1a1]">
                      {selectedEvent.registrationCount} / {selectedEvent.maxSpots} spots filled
                    </span>
                    <span className="text-sm font-medium text-korus-primary">
                      {Math.round((selectedEvent.registrationCount / selectedEvent.maxSpots) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-white/15 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{
                        backgroundColor: getEventTypeColor(selectedEvent.type),
                        width: `${(selectedEvent.registrationCount / selectedEvent.maxSpots) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="mt-8">
                {!connected ? (
                  <button className="w-full bg-white/[0.08] border border-[#262626] text-[#fafafa] font-semibold py-4 rounded-lg hover:bg-white/[0.12] duration-150">
                    Connect Wallet to Participate
                  </button>
                ) : (
                  <button
                    onClick={handleParticipate}
                    disabled={isParticipating}
                    className="w-full bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-semibold py-4 rounded-lg hover:shadow-lg hover:shadow-korus-primary/20 duration-150 disabled:opacity-50"
                  >
                    {isParticipating ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                        Processing...
                      </div>
                    ) : (
                      'Join Whitelist'
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
        onSubscriptionUpdated={refreshStatus}
      />

      {/* Mobile Menu Modal */}
      <MobileMenuModal
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
      />
    </main>
  );
}