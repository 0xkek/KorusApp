'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import { useToastContext } from '@/components/ToastProvider';
import ConfirmModal from '@/components/ConfirmModal';

interface NFTAvatar {
  id: string;
  name: string;
  image: string;
  uri: string;
  collection?: string;
}

export default function EditProfilePage() {
  const { connected, publicKey } = useWallet();
  const { showSuccess, showError } = useToastContext();
  const router = useRouter();

  // Mock wallet and user data (replace with actual context/API later)
  const walletAddress = publicKey?.toBase58() || '';
  const selectedAvatar = '🎮'; // Mock avatar
  const selectedNFTAvatar: NFTAvatar | null = null;
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
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

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
        // TODO: Implement API call to load user profile
        // Mock loading delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mock existing profile data
        setDisplayName('');
        setBio('');
        setLocation('');
        setWebsite('');
        setTwitter('');
        setSelectedThemeColor('#43e97b');
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [connected, router]);

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
      console.log('Saving profile to backend...');

      // TODO: Implement API call to save profile
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API delay

      console.log('Profile saved successfully');
      showSuccess('Profile updated successfully!');
      router.back();
    } catch (error) {
      console.error('Failed to save profile:', error);
      showError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeAvatar = () => {
    setShowAvatarSelection(true);
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-korus-textSecondary mb-8">Please connect your wallet to edit your profile</p>
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-korus-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-korus-dark-100 relative overflow-hidden">
      {/* Background gradients */}
      <div className="fixed inset-0 bg-gradient-to-br from-korus-dark-100 via-korus-dark-200 to-korus-dark-100">
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-korus-dark-300/25 to-korus-dark-200/35" />
      </div>

      {/* Animated gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-korus-primary/30 to-korus-secondary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-korus-secondary/25 to-korus-primary/15 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-korus-primary/10 to-korus-secondary/10 rounded-full blur-3xl animate-float-delayed" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex min-h-screen">
          {/* Left Sidebar */}
          <div className="hidden lg:block lg:w-80 xl:w-80 fixed left-0 top-0 h-full border-r border-korus-border bg-korus-surface/5 backdrop-blur-sm">
            {/* Left sidebar content would go here */}
          </div>

          {/* Main Content */}
          <div className="flex-1 lg:ml-80 lg:mr-96 md:ml-64 md:mr-80 sm:ml-0 sm:mr-0 md:border-x md:border-korus-border bg-korus-surface/10 backdrop-blur-sm max-w-full overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-korus-surface/80 backdrop-blur-md border-b border-korus-borderLight">
              <div className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleDiscardChanges}
                      className="p-2 hover:bg-korus-surface/60 rounded-full transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h1 className="text-3xl font-bold text-white">Edit Profile</h1>
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
                  {selectedNFTAvatar ? (
                    <img
                      src={selectedNFTAvatar.image || selectedNFTAvatar.uri}
                      alt="NFT Avatar"
                      className="w-20 h-20 rounded-full object-cover"
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
            <p className="text-korus-textSecondary text-sm">Click to change your avatar</p>
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
                className="w-full bg-korus-surface/20 backdrop-blur-sm text-white border border-korus-borderLight rounded-xl px-4 py-3 placeholder-gray-400 focus:outline-none focus:border-korus-primary transition-colors"
                maxLength={50}
              />
              <p className="text-korus-textSecondary text-xs mt-1">This is how other users will see your name</p>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium mb-2">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                className="w-full bg-korus-surface/20 backdrop-blur-sm text-white border border-korus-borderLight rounded-xl px-4 py-3 placeholder-gray-400 focus:outline-none focus:border-korus-primary transition-colors resize-none"
                rows={4}
                maxLength={200}
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-korus-textSecondary text-xs">Share a bit about yourself</p>
                <span className="text-korus-textSecondary text-xs">{bio.length}/200</span>
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
                className="w-full bg-korus-surface/20 backdrop-blur-sm text-white border border-korus-borderLight rounded-xl px-4 py-3 placeholder-gray-400 focus:outline-none focus:border-korus-primary transition-colors"
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
                className="w-full bg-korus-surface/20 backdrop-blur-sm text-white border border-korus-borderLight rounded-xl px-4 py-3 placeholder-gray-400 focus:outline-none focus:border-korus-primary transition-colors"
              />
            </div>

            {/* Twitter */}
            <div>
              <label className="block text-sm font-medium mb-2">Twitter</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-korus-textSecondary">@</span>
                <input
                  type="text"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value.replace('@', ''))}
                  placeholder="username"
                  className="w-full bg-korus-surface/20 backdrop-blur-sm text-white border border-korus-borderLight rounded-xl pl-8 pr-4 py-3 placeholder-gray-400 focus:outline-none focus:border-korus-primary transition-colors"
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
                        : 'border-gray-600 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: theme.color }}
                    title={theme.name}
                  >
                    {selectedThemeColor === theme.color && (
                      <svg className="w-6 h-6 text-white mx-auto" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-korus-textSecondary text-xs mt-2">Choose your personal theme color</p>
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
                    <p className="text-gray-300 text-sm mb-3">
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

          {/* Right Sidebar */}
          <div className="hidden lg:block lg:w-96 xl:w-96 fixed right-0 top-0 h-full border-l border-korus-border bg-korus-surface/5 backdrop-blur-sm">
            {/* Right sidebar content would go here */}
          </div>
        </div>
      </div>

      {/* Avatar Selection Modal (placeholder) */}
      {showAvatarSelection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-korus-surface/20 backdrop-blur-sm border border-korus-borderLight rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Change Avatar</h3>
              <button
                onClick={() => setShowAvatarSelection(false)}
                className="p-2 hover:bg-korus-surface/60 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="text-center py-8">
              <p className="text-korus-textSecondary">Avatar selection coming soon!</p>
              <p className="text-korus-textSecondary text-sm mt-2">Choose from emojis or upload your NFT avatar</p>
            </div>

            <button
              onClick={() => setShowAvatarSelection(false)}
              className="w-full bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold py-3 rounded-lg hover:shadow-lg transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

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
      </div>
    </main>
  );
}