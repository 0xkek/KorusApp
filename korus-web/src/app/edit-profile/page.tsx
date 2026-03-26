'use client';
import { logger } from '@/utils/logger';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useToastContext } from '@/components/ToastProvider';
import { type NFT } from '@/lib/api';
import { useAllSNSDomains } from '@/hooks/useSNSDomain';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';

// Dynamically import modals for code splitting
const ConfirmModal = dynamic(() => import('@/components/ConfirmModal'), { ssr: false });
const NFTAvatarModal = dynamic(() => import('@/components/NFTAvatarModal'), { ssr: false });

export default function EditProfilePage() {
  const { connected, publicKey } = useWallet();
  const { showSuccess, showError } = useToastContext();
  const router = useRouter();

  // Mock wallet and user data (replace with actual context/API later)
  const walletAddress = publicKey?.toBase58() || '';
  const selectedAvatar = '🎮'; // Mock avatar
  const snsDomain = null; // Mock SNS domain
  const timeFunUsername = null;
  const isPremium = false; // Mock premium status

  // State for editable fields
  const [displayName, setDisplayName] = useState(snsDomain || timeFunUsername || '');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedThemeColor, setSelectedThemeColor] = useState('#43e97b');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarSelection, setShowAvatarSelection] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNFTAvatar, setSelectedNFTAvatar] = useState<NFT | null>(null);
  const [selectedSNSDomain, setSelectedSNSDomain] = useState<string>('');

  // Fetch SNS domains for this wallet
  const { domains: snsDomains, loading: snsLoading } = useAllSNSDomains(walletAddress);

  // Theme color options
  const themeColors = [
    { name: 'Korus Green', color: '#43e97b' },
    { name: 'Cyan', color: '#38f9d7' },
    { name: 'Red', color: '#FF6B6B' },
    { name: 'Teal', color: '#4ECDC4' },
    { name: 'Blue', color: '#45B7D1' },
    { name: 'Sage', color: '#96CEB4' },
    { name: 'Plum', color: '#DDA0DD' },
    { name: 'Yellow', color: '#FFD93D' },
    { name: 'Purple', color: '#6C5CE7' },
    { name: 'Pink', color: '#FD79A8' },
  ];

  useEffect(() => {
    if (!connected) {
      router.push('/');
      return;
    }

    const loadProfile = async () => {
      try {
        // Get auth token
        const token = localStorage.getItem('authToken');
        if (!token) {
          setIsLoading(false);
          return;
        }

        // Load profile from API
        const { usersAPI } = await import('@/lib/api');
        const { user } = await usersAPI.getProfile(token);

        // Populate form with existing data
        setDisplayName(user.displayName || '');
        setBio(user.bio || '');
        setLocation(user.location || '');
        setWebsite(user.website || '');
        setTwitter(user.twitter || '');
        setSelectedThemeColor(user.themeColor || '#43e97b');
        setSelectedSNSDomain(user.snsUsername || '');

        // If user has an NFT avatar, create a minimal NFT object
        if (user.nftAvatar) {
          // Check if nftAvatar is a URL (old data) or a mint address (new data)
          const isUrl = user.nftAvatar.startsWith('http://') || user.nftAvatar.startsWith('https://');

          setSelectedNFTAvatar({
            name: 'Current Avatar',
            symbol: '',
            uri: isUrl ? user.nftAvatar : '',
            image: isUrl ? user.nftAvatar : '',
            mint: isUrl ? '' : user.nftAvatar
          });
        }
      } catch (error) {
        logger.error('Failed to load profile:', error);
        showError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [connected, router, showError]);

  // Track changes
  useEffect(() => {
    const hasAnyChanges =
      displayName !== (snsDomain || timeFunUsername || '') ||
      bio !== '' ||
      location !== '' ||
      website !== '' ||
      twitter !== '' ||
      selectedThemeColor !== '#43e97b';

    setHasChanges(hasAnyChanges);
  }, [displayName, bio, location, website, twitter, selectedThemeColor, snsDomain, timeFunUsername]);

  const handleSave = async () => {
    if (!hasChanges) return;

    // Validate inputs
    if (website && !website.startsWith('http')) {
      showError('Website URL must start with http:// or https://');
      return;
    }

    setIsSaving(true);
    try {
      // Get auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        showError('Please reconnect your wallet to save profile');
        return;
      }

      // Save profile via API
      const { usersAPI } = await import('@/lib/api');

      // Determine what to send for nftAvatar:
      // - If there's a mint address, send it (new/correct behavior)
      // - If there's only an image URL (old data), send the URL to preserve it
      // - Otherwise send undefined
      const nftAvatarValue = selectedNFTAvatar?.mint ||
                            selectedNFTAvatar?.image ||
                            undefined;

      await usersAPI.updateProfile({
        displayName,
        bio,
        location,
        website,
        twitter,
        themeColor: selectedThemeColor,
        nftAvatar: nftAvatarValue,
        snsUsername: selectedSNSDomain || undefined
      }, token);

      showSuccess('Profile updated successfully!');
      router.back();
    } catch (error: unknown) {
      const errorMessage = (error as { data?: { error?: string }, message?: string })?.data?.error ||
                          (error as { message?: string })?.message ||
                          'Failed to save profile';
      showError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeAvatar = () => {
    logger.log('handleChangeAvatar called');
    setShowAvatarSelection(true);
    logger.log('showAvatarSelection set to true');
  };

  const handleSelectNFT = (nft: NFT) => {
    logger.log('NFT selected:', nft);
    setSelectedNFTAvatar(nft);
    setHasChanges(true);
  };

  const handleDiscardChanges = () => {
    if (hasChanges) {
      setShowDiscardModal(true);
    } else {
      router.back();
    }
  };

  const confirmDiscard = () => {
    router.back();
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-[var(--color-text-secondary)] mb-8">Please connect your wallet to edit your profile</p>
          <Link
            href="/"
            className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-lg hover:shadow-lg transition-all"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-korus-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-background)] relative overflow-hidden">
      {/* Background gradients */}
      <div className="fixed inset-0 bg-gradient-to-br from-[var(--color-background)] via-[var(--color-surface)] to-[var(--color-background)]">
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[var(--color-surface)]/25 to-[var(--color-surface)]/35" />
      </div>

      {/* Animated gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-korus-primary/30 to-korus-secondary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-korus-secondary/25 to-korus-primary/15 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-korus-primary/10 to-korus-secondary/10 rounded-full blur-3xl animate-float-delayed" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex min-h-screen max-w-[1280px] mx-auto">
          {/* Main Content */}
          <div className="flex-1 min-w-0 border-x border-[var(--color-border-light)]">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-[var(--color-surface)] backdrop-blur-md border-b border-[var(--color-border-light)]">
              <div className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleDiscardChanges}
                      className="p-2 hover:bg-white/[0.12] rounded-full transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h1 className="text-3xl font-bold text-[var(--color-text)]">Edit Profile</h1>
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                    className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-2 rounded-lg disabled:opacity-50 hover:shadow-lg transition-all"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Avatar Section */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-4">
              <button
                onClick={handleChangeAvatar}
                className="relative group"
              >
                <div className="w-24 h-24 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center text-3xl font-bold text-black border-4 border-transparent">
                  {selectedNFTAvatar && (selectedNFTAvatar.image || selectedNFTAvatar.uri) ? (
                    <Image
                      src={(selectedNFTAvatar.image || selectedNFTAvatar.uri) as string}
                      alt="NFT Avatar"
                      width={80}
                      height={80}
                      className="rounded-full object-cover"
                    />
                  ) : selectedAvatar ? (
                    <span>{selectedAvatar}</span>
                  ) : (
                    <span>{walletAddress.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-7 h-7 bg-korus-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
              </button>
            </div>
            <p className="text-[var(--color-text-secondary)] text-sm">Click to change your avatar</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                className="w-full bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg px-3 py-2.5 text-[var(--color-text)] placeholder-neutral-600 focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none transition-colors"
                maxLength={50}
              />
              <p className="text-[var(--color-text-secondary)] text-xs mt-1">This is how other users will see your name</p>
            </div>

            {/* SNS Domain Selection */}
            {snsDomains.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <span>SNS Domain</span>
                  {isPremium && (
                    <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-korus-primary to-korus-secondary text-black rounded-full font-bold">
                      Premium
                    </span>
                  )}
                </label>
                <select
                  value={selectedSNSDomain}
                  onChange={(e) => {
                    setSelectedSNSDomain(e.target.value);
                    setHasChanges(true);
                  }}
                  disabled={!isPremium && snsLoading}
                  className="w-full bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg px-3 py-2.5 text-[var(--color-text)] focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none transition-colors disabled:opacity-50"
                >
                  <option value="">None (use display name)</option>
                  {snsDomains.map((domain) => (
                    <option key={domain.domain} value={domain.domain}>
                      {domain.domain} {domain.favorite ? '⭐' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[var(--color-text-secondary)] text-xs mt-1">
                  {isPremium
                    ? 'Choose which SNS domain to display on your profile'
                    : 'Upgrade to Premium to use your SNS domains'}
                </p>
              </div>
            )}

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium mb-2">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                className="w-full bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg px-3 py-2.5 text-[var(--color-text)] placeholder-neutral-600 focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none transition-colors resize-none"
                rows={4}
                maxLength={200}
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-[var(--color-text-secondary)] text-xs">Share a bit about yourself</p>
                <span className="text-[var(--color-text-secondary)] text-xs">{bio.length}/200</span>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Where are you based?"
                className="w-full bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg px-3 py-2.5 text-[var(--color-text)] placeholder-neutral-600 focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none transition-colors"
                maxLength={50}
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium mb-2">Website</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
                className="w-full bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg px-3 py-2.5 text-[var(--color-text)] placeholder-neutral-600 focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none transition-colors"
              />
            </div>

            {/* Twitter */}
            <div>
              <label className="block text-sm font-medium mb-2">Twitter</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--color-text-secondary)]">@</span>
                <input
                  type="text"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value.replace('@', ''))}
                  placeholder="username"
                  className="w-full bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg pl-8 pr-3 py-2.5 text-[var(--color-text)] placeholder-neutral-600 focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none transition-colors"
                  maxLength={15}
                />
              </div>
            </div>

            {/* Theme Color */}
            <div>
              <label className="block text-sm font-medium mb-2">Theme Color</label>
              <div className="grid grid-cols-5 gap-3">
                {themeColors.map((theme) => (
                  <button
                    key={theme.color}
                    onClick={() => setSelectedThemeColor(theme.color)}
                    className={`aspect-square rounded-xl border-2 transition-all hover:scale-105 ${
                      selectedThemeColor === theme.color
                        ? 'border-white shadow-lg'
                        : 'border-[var(--color-border-light)] hover:border-white/20'
                    }`}
                    style={{ backgroundColor: theme.color }}
                    title={theme.name}
                  >
                    {selectedThemeColor === theme.color && (
                      <svg className="w-6 h-6 text-[var(--color-text)] mx-auto" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-[var(--color-text-secondary)] text-xs mt-2">Choose your personal theme color</p>
            </div>

            {/* Premium Features */}
            {!isPremium && (
              <div className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 border border-yellow-400/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-3.5 h-3.5 text-black" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-yellow-400 font-semibold mb-1">Unlock Premium Features</h3>
                    <p className="text-[var(--color-text-secondary)] text-sm mb-3">
                      Get access to custom banners, more theme colors, and advanced profile customization.
                    </p>
                    <Link
                      href="/premium"
                      className="inline-block bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-bold px-4 py-2 rounded-lg text-sm hover:shadow-lg transition-all"
                    >
                      Upgrade to Premium
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Save Changes Notice */}
            {hasChanges && (
              <div className="bg-korus-primary/20 border border-korus-primary/20 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.854-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                  </svg>
                  <div>
                    <p className="text-korus-primary font-medium text-sm">You have unsaved changes</p>
                    <p className="text-korus-primary/80 text-xs">Don&apos;t forget to save your profile updates</p>
                  </div>
                </div>
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

      <LeftSidebar
        onNotificationsToggle={() => setShowNotifications(!showNotifications)}
        onPostButtonClick={() => {}}
        onSearchClick={() => {}}
      />

      {/* NFT Avatar Selection Modal */}
      <NFTAvatarModal
        isOpen={showAvatarSelection}
        onClose={() => setShowAvatarSelection(false)}
        onSelectNFT={handleSelectNFT}
        currentAvatarNFT={selectedNFTAvatar?.mint}
      />

      {/* Discard Changes Confirmation Modal */}
      <ConfirmModal
        isOpen={showDiscardModal}
        onClose={() => setShowDiscardModal(false)}
        onConfirm={confirmDiscard}
        title="Discard Changes?"
        message="Are you sure you want to discard your changes? This action cannot be undone."
        confirmText="Discard"
        cancelText="Keep Editing"
        confirmVariant="danger"
      />
    </main>
  );
}