'use client';
import { logger } from '@/utils/logger';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import { useToast } from '@/hooks/useToast';
import { useWalletAuth } from '@/contexts/WalletAuthContext';
import * as eventsAPI from '@/lib/api/events';
import dynamic from 'next/dynamic';

// Dynamically import modals
const SearchModal = dynamic(() => import('@/components/SearchModal'), { ssr: false });
const CreatePostModal = dynamic(() => import('@/components/CreatePostModal'), { ssr: false });
const MobileMenuModal = dynamic(() => import('@/components/MobileMenuModal'), { ssr: false });

export default function ManageEventsPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const { token, isAuthenticated } = useWalletAuth();
  const { showSuccess, showError } = useToast();

  // UI State
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<eventsAPI.Event | null>(null);
  const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);

  // Data State
  const [myEvents, setMyEvents] = useState<eventsAPI.Event[]>([]);
  const [registrations, setRegistrations] = useState<eventsAPI.WhitelistRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);

  // Fetch user's events
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setIsLoading(false);
      return;
    }

    async function fetchMyEvents() {
      if (!token) return;
      try {
        setIsLoading(true);
        const response = await eventsAPI.getMyEvents(token);
        setMyEvents(response.events);
      } catch (error) {
        logger.error('Failed to fetch events:', error);
        showError('Failed to load your events');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMyEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  const viewRegistrations = async (event: eventsAPI.Event) => {
    if (!token) return;

    setSelectedEvent(event);
    setIsLoadingRegistrations(true);
    setShowRegistrationsModal(true);

    try {
      const response = await eventsAPI.getEventRegistrations(event.id, token);
      setRegistrations(response.registrations);
    } catch (error: unknown) {
      logger.error('Failed to fetch registrations:', error);
      showError((error as Error).message || 'Failed to load registrations');
    } finally {
      setIsLoadingRegistrations(false);
    }
  };

  const exportRegistrations = async (format: 'csv' | 'json') => {
    if (!selectedEvent || !token) return;

    try {
      const data = await eventsAPI.exportRegistrations(selectedEvent.id, format, token);

      // Create download
      const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedEvent.projectName}-registrations.${format}`;
      a.click();
      URL.revokeObjectURL(url);

      showSuccess(`Exported ${registrations.length} registrations as ${format.toUpperCase()}`);
    } catch (error: unknown) {
      logger.error('Failed to export:', error);
      showError((error as Error).message || 'Failed to export registrations');
    }
  };

  const closeEvent = async (eventId: string) => {
    if (!token) return;
    if (!confirm('Are you sure you want to close this event early?')) return;

    try {
      await eventsAPI.closeEvent(eventId, token);
      showSuccess('Event closed successfully');
      // Refresh events
      const response = await eventsAPI.getMyEvents(token);
      setMyEvents(response.events);
    } catch (error: unknown) {
      logger.error('Failed to close event:', error);
      showError((error as Error).message || 'Failed to close event');
    }
  };

  const getEventTypeIcon = (type: eventsAPI.Event['type']) => {
    switch (type) {
      case 'whitelist': return '📋';
      case 'token_launch': return '🚀';
      case 'nft_mint': return '🖼️';
      case 'airdrop': return '🎁';
      case 'ido': return '📈';
      default: return '📅';
    }
  };

  const getStatusBadge = (event: eventsAPI.Event) => {
    if (event.status === 'closed') {
      return <span className="px-3 py-1 bg-[#525252]/20 text-[#a1a1a1] text-xs font-bold rounded-full">Closed</span>;
    }
    if (event.status === 'cancelled') {
      return <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full">Cancelled</span>;
    }
    if (new Date(event.endDate) < new Date()) {
      return <span className="px-3 py-1 bg-[#525252]/20 text-[#a1a1a1] text-xs font-bold rounded-full">Ended</span>;
    }
    if (new Date(event.startDate) > new Date()) {
      return <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full">Upcoming</span>;
    }
    return <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full">🔴 Live</span>;
  };

  if (!connected) {
    return (
      <main className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-semibold text-[#fafafa] mb-2">Wallet Not Connected</h2>
          <p className="text-[#a1a1a1]">Please connect your wallet to manage events</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#121212] relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#121212] via-[#111111] to-[#121212]">
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#171717]/25 to-[#111111]/35" />
      </div>
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-gradient-to-br from-korus-primary/8 to-korus-secondary/6 rounded-full blur-[80px]" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-korus-secondary/6 to-korus-primary/8 rounded-full blur-[70px]" />
      </div>

      <div className="relative z-10">
        <div className="flex min-h-screen max-w-[1280px] mx-auto">
          <LeftSidebar
            onNotificationsToggle={() => setShowNotifications(!showNotifications)}
            onPostButtonClick={() => setShowCreatePostModal(true)}
            onSearchClick={() => setShowSearchModal(true)}
          />

          {/* Main Content */}
          <div className="flex-1 min-w-0 border-x border-[#222222]">

            {/* Header */}
            <div className="sticky top-0 bg-[#171717]/80 backdrop-blur-xl border-b border-[#222222] z-10">
              <div className="px-6 py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-semibold text-[#fafafa]">My Events</h1>
                    <p className="text-[#a1a1a1] text-sm">Manage your community events and whitelists</p>
                  </div>
                  <button
                    onClick={() => router.push('/events/create')}
                    className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-semibold px-6 py-2.5 rounded-lg hover:shadow-lg duration-150"
                  >
                    + Create Event
                  </button>
                </div>
              </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8">
              {isLoading ? (
                <div className="text-center py-20">
                  <div className="w-12 h-12 border-4 border-korus-primary/20 border-t-korus-primary rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-[#a1a1a1]">Loading your events...</p>
                </div>
              ) : myEvents.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">📅</div>
                  <h3 className="text-xl font-semibold text-[#fafafa] mb-2">No Events Yet</h3>
                  <p className="text-[#a1a1a1] mb-6">Create your first event to get started</p>
                  <button
                    onClick={() => router.push('/events/create')}
                    className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-semibold px-8 py-3 rounded-lg hover:shadow-lg duration-150"
                  >
                    Create Event
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {myEvents.map((event) => (
                    <div
                      key={event.id}
                      className="border border-[#222222] bg-[#171717] rounded-xl overflow-hidden hover:bg-white/[0.04] duration-150"
                    >
                      <div className="p-6">
                        <div className="flex gap-6">
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

                          {/* Event Info */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="text-2xl">{getEventTypeIcon(event.type)}</span>
                                  <h3 className="text-xl font-semibold text-[#fafafa]">{event.title}</h3>
                                  {getStatusBadge(event)}
                                </div>
                                <p className="text-korus-primary font-medium text-sm">{event.projectName}</p>
                              </div>
                            </div>

                            <p className="text-[#a1a1a1] text-sm mb-4 line-clamp-2">{event.description}</p>

                            {/* Stats */}
                            <div className="flex items-center gap-6 text-sm mb-4">
                              <div className="flex items-center gap-2">
                                <span className="text-[#737373]">👥</span>
                                <span className="text-[#fafafa] font-medium">{event.registrationCount}</span>
                                <span className="text-[#737373]">registrations</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[#737373]">👁️</span>
                                <span className="text-[#fafafa] font-medium">{event.viewCount}</span>
                                <span className="text-[#737373]">views</span>
                              </div>
                              {event.maxSpots && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[#737373]">🎯</span>
                                  <span className="text-[#fafafa] font-medium">{event.maxSpots}</span>
                                  <span className="text-[#737373]">max spots</span>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                              <button
                                onClick={() => router.push(`/events/${event.id}`)}
                                className="px-4 py-2 bg-white/[0.08] border border-[#2a2a2a] text-[#fafafa] font-semibold rounded-lg hover:bg-white/[0.12] duration-150 text-sm"
                              >
                                View Details
                              </button>
                              <button
                                onClick={() => viewRegistrations(event)}
                                className="px-4 py-2 bg-korus-primary/20 hover:bg-korus-primary/30 text-korus-primary font-semibold rounded-lg transition-colors text-sm"
                              >
                                View Registrations ({event.registrationCount})
                              </button>
                              {event.status === 'active' && new Date(event.endDate) > new Date() && (
                                <button
                                  onClick={() => closeEvent(event.id)}
                                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold rounded-lg transition-colors text-sm"
                                >
                                  Close Early
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
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

      {/* Registrations Modal */}
      {showRegistrationsModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1e1e] border border-[#222222] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#222222] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#fafafa]">{selectedEvent.title}</h2>
                <p className="text-sm text-[#a1a1a1]">{registrations.length} registrations</p>
              </div>
              <button
                onClick={() => setShowRegistrationsModal(false)}
                className="w-8 h-8 rounded-full bg-white/[0.12] hover:bg-[#171717] flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5 text-[#fafafa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Export Buttons */}
            <div className="px-6 py-3 border-b border-[#222222] flex gap-3">
              <button
                onClick={() => exportRegistrations('csv')}
                className="px-4 py-2 bg-korus-primary/20 hover:bg-korus-primary/30 text-korus-primary font-semibold rounded-lg transition-colors text-sm"
              >
                📄 Export CSV
              </button>
              <button
                onClick={() => exportRegistrations('json')}
                className="px-4 py-2 bg-korus-secondary/20 hover:bg-korus-secondary/30 text-korus-secondary font-semibold rounded-lg transition-colors text-sm"
              >
                📦 Export JSON
              </button>
            </div>

            {/* Registrations List */}
            <div className="overflow-y-auto max-h-[60vh] p-6">
              {isLoadingRegistrations ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-korus-primary/20 border-t-korus-primary rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-[#a1a1a1] text-sm">Loading registrations...</p>
                </div>
              ) : registrations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-[#a1a1a1]">No registrations yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {registrations.map((reg, index) => (
                    <div
                      key={reg.id}
                      className="bg-[#171717] border border-[#222222] rounded-xl p-4 hover:bg-white/[0.04] duration-150"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center">
                            <span className="text-black font-bold text-sm">#{index + 1}</span>
                          </div>
                          <div>
                            <div className="font-mono text-[#fafafa] text-sm">
                              {reg.walletAddress.slice(0, 8)}...{reg.walletAddress.slice(-6)}
                            </div>
                            <div className="text-xs text-[#737373]">
                              {new Date(reg.registeredAt).toLocaleDateString()} at {new Date(reg.registeredAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {reg.position && (
                            <span className="text-xs bg-korus-primary/20 text-korus-primary px-2 py-1 rounded-full font-medium">
                              Position #{reg.position}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            reg.status === 'selected'
                              ? 'bg-green-500/20 text-green-400'
                              : reg.status === 'waitlist'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {reg.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        allPosts={[]}
      />

      <CreatePostModal
        isOpen={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onPostCreate={() => {
          showSuccess('Post created successfully!');
          setShowCreatePostModal(false);
        }}
      />

      <MobileMenuModal
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
      />
    </main>
  );
}
