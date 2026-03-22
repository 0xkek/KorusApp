'use client';
import { logger } from '@/utils/logger';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

export default function EventDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { connected, publicKey } = useWallet();
  const { token } = useWalletAuth();
  const { showSuccess, showError } = useToast();

  // UI State
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Data State
  const [event, setEvent] = useState<eventsAPI.Event | null>(null);
  const [registrations, setRegistrations] = useState<eventsAPI.WhitelistRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<eventsAPI.WhitelistRegistration | null>(null);

  // Fetch event details
  useEffect(() => {
    async function fetchEvent() {
      try {
        setIsLoading(true);
        const response = await eventsAPI.getEvent(eventId);
        setEvent(response.event);

        // Check if current user is the creator
        if (publicKey && response.event.creatorWallet === publicKey.toBase58()) {
          setIsCreator(true);
        }
      } catch (error: unknown) {
        logger.error('Failed to fetch event:', error);
        showError((error as Error).message || 'Failed to load event');
      } finally {
        setIsLoading(false);
      }
    }

    if (eventId) {
      fetchEvent();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Fetch registrations if creator
  useEffect(() => {
    async function fetchRegistrations() {
      if (!isCreator || !token || !event) return;

      try {
        setIsLoadingRegistrations(true);
        const response = await eventsAPI.getEventRegistrations(event.id, token);
        setRegistrations(response.registrations);
      } catch (error: unknown) {
        logger.error('Failed to fetch registrations:', error);
        showError((error as Error).message || 'Failed to load registrations');
      } finally {
        setIsLoadingRegistrations(false);
      }
    }

    if (isCreator && event) {
      fetchRegistrations();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreator, token, event]);

  // Check registration status for non-creator users
  useEffect(() => {
    async function checkRegistrationStatus() {
      if (isCreator || !connected || !token || !event) return;

      try {
        const response = await eventsAPI.getRegistrationStatus(event.id, token);
        setIsRegistered(response.registered);
        setRegistrationStatus(response.registration || null);
      } catch (error: unknown) {
        logger.error('Failed to check registration status:', error);
      }
    }

    if (!isCreator && connected && token && event) {
      checkRegistrationStatus();
    }
  }, [isCreator, connected, token, event]);

  const exportRegistrations = async (format: 'csv' | 'json') => {
    if (!event || !token) return;

    try {
      const data = await eventsAPI.exportRegistrations(event.id, format, token);

      // Create download
      const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event.projectName}-registrations.${format}`;
      a.click();
      URL.revokeObjectURL(url);

      showSuccess(`Exported ${registrations.length} registrations as ${format.toUpperCase()}`);
    } catch (error: unknown) {
      logger.error('Failed to export:', error);
      showError((error as Error).message || 'Failed to export registrations');
    }
  };

  const handleRegister = async () => {
    if (!event || !connected || !publicKey || !token) {
      showError('Please connect your wallet first');
      return;
    }

    // Check if wallet supports message signing
    const walletAdapter = (window as { solana?: { signMessage?: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array; publicKey: Uint8Array }> } }).solana;
    if (!walletAdapter || !walletAdapter.signMessage) {
      showError('Your wallet does not support message signing');
      return;
    }

    setIsRegistering(true);
    try {
      // Generate message for wallet signing
      const message = eventsAPI.generateSignatureMessage(event.id, event.projectName);
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
        event.id,
        {
          signature: signatureBase58,
          signedMessage: message
        },
        token
      );

      setIsRegistered(true);
      setRegistrationStatus(response.registration);
      showSuccess(response.message || 'Successfully registered for the whitelist!');

      // Refresh event data to update registration count
      const eventResponse = await eventsAPI.getEvent(event.id);
      setEvent(eventResponse.event);
    } catch (error: unknown) {
      logger.error('Failed to register:', error);
      if ((error as Error).message?.includes('rejected') || (error as Error).message?.includes('User rejected')) {
        showError('You rejected the signature request');
      } else {
        showError((error as Error).message || 'Failed to register for whitelist');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCancelEvent = async () => {
    if (!event || !token) return;

    setIsCancelling(true);
    try {
      const response = await eventsAPI.cancelEvent(event.id, token);
      setEvent(response.event);
      setShowCancelModal(false);
      showSuccess('Event cancelled successfully');

      // Redirect to manage page after a short delay
      setTimeout(() => {
        router.push('/events/manage');
      }, 2000);
    } catch (error: unknown) {
      logger.error('Failed to cancel event:', error);
      showError((error as Error).message || 'Failed to cancel event');
    } finally {
      setIsCancelling(false);
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
      return <span className="px-3 py-1 bg-gray-500/20 text-gray-400 text-xs font-bold rounded-full">Closed</span>;
    }
    if (event.status === 'cancelled') {
      return <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full">Cancelled</span>;
    }
    if (new Date(event.endDate) < new Date()) {
      return <span className="px-3 py-1 bg-gray-500/20 text-gray-400 text-xs font-bold rounded-full">Ended</span>;
    }
    if (new Date(event.startDate) > new Date()) {
      return <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full">Upcoming</span>;
    }
    return <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full">🔴 Live</span>;
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-korus-dark-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-korus-primary/20 border-t-korus-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-korus-textSecondary">Loading event...</p>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-korus-dark-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-white mb-2">Event Not Found</h2>
          <p className="text-korus-textSecondary mb-6">This event doesn&apos;t exist or has been removed</p>
          <button
            onClick={() => router.back()}
            className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-xl"
          >
            Go Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-korus-dark-100 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-korus-dark-100 via-korus-dark-200 to-korus-dark-100">
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-korus-dark-300/25 to-korus-dark-200/35" />
      </div>
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-gradient-to-br from-korus-primary/8 to-korus-secondary/6 rounded-full blur-[80px]" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-korus-secondary/6 to-korus-primary/8 rounded-full blur-[70px]" />
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

            {/* Header */}
            <div className="sticky top-0 bg-korus-dark-300/80 backdrop-blur-xl border-b border-korus-border z-10 px-6 py-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="w-10 h-10 rounded-full bg-korus-surface/40 hover:bg-korus-surface/60 flex items-center justify-center transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-2xl font-bold force-theme-text">Event Details</h1>
                  <p className="text-korus-textSecondary text-sm">{event.projectName}</p>
                </div>
              </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
              {/* Event Header */}
              <div className="border border-korus-borderLight bg-korus-surface/20 rounded-2xl overflow-hidden">
                {event.imageUrl && (
                  <div className="w-full h-64 relative">
                    <Image
                      src={event.imageUrl}
                      alt={event.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{getEventTypeIcon(event.type)}</span>
                      <div>
                        <h2 className="text-2xl font-bold force-theme-text mb-1">{event.title}</h2>
                        <p className="text-korus-primary font-medium">{event.projectName}</p>
                      </div>
                    </div>
                    {getStatusBadge(event)}
                  </div>

                  <p className="text-korus-textSecondary mb-6">{event.description}</p>

                  {/* Event Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-korus-surface/30 rounded-xl p-4">
                      <div className="text-korus-textTertiary text-xs mb-1">Start Date</div>
                      <div className="text-white font-semibold text-sm">
                        {new Date(event.startDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="bg-korus-surface/30 rounded-xl p-4">
                      <div className="text-korus-textTertiary text-xs mb-1">End Date</div>
                      <div className="text-white font-semibold text-sm">
                        {new Date(event.endDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="bg-korus-surface/30 rounded-xl p-4">
                      <div className="text-korus-textTertiary text-xs mb-1">Registrations</div>
                      <div className="text-white font-semibold text-sm">{event.registrationCount}</div>
                    </div>
                    <div className="bg-korus-surface/30 rounded-xl p-4">
                      <div className="text-korus-textTertiary text-xs mb-1">Views</div>
                      <div className="text-white font-semibold text-sm">{event.viewCount}</div>
                    </div>
                  </div>

                  {/* External Link */}
                  {event.externalLink && (
                    <a
                      href={event.externalLink.startsWith('http') ? event.externalLink : `https://${event.externalLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-korus-primary hover:text-korus-secondary transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Visit Project Website
                    </a>
                  )}
                </div>
              </div>

              {/* Registration Section for Non-Creators */}
              {!isCreator && (
                <div className="border border-korus-borderLight bg-korus-surface/20 rounded-2xl p-6">
                  <h3 className="text-lg font-bold force-theme-text mb-4">Join Whitelist</h3>

                  {!connected ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3">🔒</div>
                      <p className="text-korus-textSecondary mb-4">Connect your wallet to register</p>
                      <button
                        onClick={() => showError('Please connect your wallet using the button in the sidebar')}
                        className="px-6 py-3 bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold rounded-xl hover:shadow-lg transition-all"
                      >
                        Connect Wallet
                      </button>
                    </div>
                  ) : isRegistered ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h4 className="text-xl font-bold text-green-400 mb-2">Successfully Registered!</h4>
                      <p className="text-korus-textSecondary mb-4">
                        You&apos;re on the whitelist for this event
                      </p>
                      {registrationStatus?.position && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-korus-primary/20 text-korus-primary rounded-full font-medium">
                          Position #{registrationStatus.position}
                        </div>
                      )}
                      <div className="mt-4 text-xs text-korus-textTertiary">
                        Registered on {registrationStatus?.registeredAt ? new Date(registrationStatus.registeredAt).toLocaleDateString() : ''}
                      </div>
                    </div>
                  ) : event.status === 'cancelled' ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3">❌</div>
                      <p className="text-red-400 font-semibold mb-2">Event Cancelled</p>
                      <p className="text-korus-textSecondary text-sm">This event has been cancelled by the creator</p>
                    </div>
                  ) : event.status === 'closed' || new Date(event.endDate) < new Date() ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3">🔒</div>
                      <p className="text-korus-textSecondary font-semibold mb-2">Registration Closed</p>
                      <p className="text-korus-textSecondary text-sm">This event is no longer accepting registrations</p>
                    </div>
                  ) : new Date(event.startDate) > new Date() ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3">⏰</div>
                      <p className="text-korus-textSecondary font-semibold mb-2">Not Started Yet</p>
                      <p className="text-korus-textSecondary text-sm">
                        Registration opens on {new Date(event.startDate).toLocaleDateString()}
                      </p>
                    </div>
                  ) : event.maxSpots && event.registrationCount >= event.maxSpots ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3">😢</div>
                      <p className="text-korus-textSecondary font-semibold mb-2">Whitelist Full</p>
                      <p className="text-korus-textSecondary text-sm">
                        All {event.maxSpots} spots have been filled
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Requirements Check */}
                      {event.requirements && event.requirements.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm font-bold text-white mb-3">Requirements</h4>
                          <div className="space-y-2">
                            {event.requirements.map((req, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm text-korus-textSecondary">
                                <svg className="w-4 h-4 text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {req}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Registration Progress */}
                      {event.maxSpots && (
                        <div className="mb-6">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-korus-textSecondary">
                              {event.registrationCount} / {event.maxSpots} spots filled
                            </span>
                            <span className="text-sm font-medium text-korus-primary">
                              {Math.round((event.registrationCount / event.maxSpots) * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-korus-borderLight rounded-full h-2">
                            <div
                              className="h-2 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full transition-all"
                              style={{ width: `${(event.registrationCount / event.maxSpots) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Register Button */}
                      <button
                        onClick={handleRegister}
                        disabled={isRegistering}
                        className="w-full py-4 bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold rounded-xl hover:shadow-lg hover:shadow-korus-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRegistering ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                            Signing Message...
                          </div>
                        ) : (
                          'Register for Whitelist'
                        )}
                      </button>

                      <p className="text-xs text-korus-textTertiary mt-3 text-center">
                        You&apos;ll be asked to sign a message with your wallet to verify ownership
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Creator-Only Sections */}
              {isCreator && (
                <>
                  {/* Cancel Event Section - Only show if event is not already cancelled */}
                  {event.status !== 'cancelled' && (
                    <div className="border border-red-500/30 bg-red-500/10 rounded-2xl p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-red-400 mb-2">⚠️ Danger Zone</h3>
                          <p className="text-red-300/80 text-sm mb-1">
                            Cancel this event and notify all participants.
                          </p>
                          <p className="text-red-300/60 text-xs">
                            <strong>Important:</strong> Event creation fees are non-refundable. Cancelled events cannot be reactivated.
                          </p>
                        </div>
                        <button
                          onClick={() => setShowCancelModal(true)}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-semibold rounded-lg transition-colors text-sm"
                        >
                          Cancel Event
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Export Section */}
                  <div className="border border-korus-borderLight bg-korus-surface/20 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold force-theme-text mb-1">Export Registrations</h3>
                        <p className="text-korus-textSecondary text-sm">Download all participant wallet addresses</p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => exportRegistrations('csv')}
                          disabled={registrations.length === 0}
                          className="px-4 py-2 bg-korus-primary/20 hover:bg-korus-primary/30 text-korus-primary font-semibold rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          📄 Export CSV
                        </button>
                        <button
                          onClick={() => exportRegistrations('json')}
                          disabled={registrations.length === 0}
                          className="px-4 py-2 bg-korus-secondary/20 hover:bg-korus-secondary/30 text-korus-secondary font-semibold rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          📦 Export JSON
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Participants List */}
                  <div className="border border-korus-borderLight bg-korus-surface/20 rounded-2xl p-6">
                    <h3 className="text-lg font-bold force-theme-text mb-4">Participants ({registrations.length})</h3>

                    {isLoadingRegistrations ? (
                      <div className="text-center py-12">
                        <div className="w-8 h-8 border-4 border-korus-primary/20 border-t-korus-primary rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-korus-textSecondary text-sm">Loading participants...</p>
                      </div>
                    ) : registrations.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-4xl mb-3">📭</div>
                        <p className="text-korus-textSecondary">No participants yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {registrations.map((reg, index) => (
                          <div
                            key={reg.id}
                            className="bg-korus-surface/20 border border-korus-borderLight rounded-xl p-4 hover:bg-korus-surface/30 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center">
                                  <span className="text-black font-bold text-sm">#{index + 1}</span>
                                </div>
                                <div>
                                  <div className="font-mono text-white text-sm">
                                    {reg.walletAddress}
                                  </div>
                                  <div className="text-xs text-korus-textTertiary">
                                    Registered {new Date(reg.registeredAt).toLocaleDateString()} at {new Date(reg.registeredAt).toLocaleTimeString()}
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
                </>
              )}
            </div>
          </div>

          <RightSidebar
            showNotifications={showNotifications}
            onNotificationsClose={() => setShowNotifications(false)}
          />
        </div>
      </div>

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

      {/* Cancel Event Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-korus-surface/90 backdrop-blur-md rounded-2xl max-w-md w-full border border-red-500/30">
            <div className="p-6">
              {/* Warning Icon */}
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-white text-center mb-3">Cancel Event?</h2>

              <div className="space-y-3 mb-6">
                <p className="text-korus-textSecondary text-sm text-center">
                  Are you sure you want to cancel <strong className="text-white">{event?.title}</strong>?
                </p>

                {/* Warning Box */}
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <h3 className="text-red-400 font-bold text-sm mb-2">⚠️ Important Information</h3>
                  <ul className="space-y-1.5 text-red-300/80 text-xs">
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      <span><strong>Event creation fees (1 SOL) are non-refundable</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      <span>All {event?.registrationCount || 0} registered participants will be notified</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      <span>Cancelled events cannot be reactivated</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      <span>This action is permanent and cannot be undone</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={isCancelling}
                  className="flex-1 px-4 py-3 bg-korus-surface/60 hover:bg-korus-surface/80 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  Keep Event
                </button>
                <button
                  onClick={handleCancelEvent}
                  disabled={isCancelling}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {isCancelling ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Cancelling...
                    </div>
                  ) : (
                    'Yes, Cancel Event'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
