'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useTheme } from 'next-themes';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import PremiumUpgradeModal from '@/components/PremiumUpgradeModal';
import { useSubscription } from '@/hooks/useSubscription';
import { authAPI } from '@/lib/api';

// TypeScript interfaces for better type safety
interface ThemeOption {
  id: string;
  name: string;
  colors: [string, string];
  free: boolean;
}

// Custom hook for debounced localStorage operations
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function SettingsPage() {
  const { connected, disconnect } = useWallet();
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { isPremium, refreshStatus } = useSubscription();
  const [mounted, setMounted] = useState(false);
  const [hideSponsoredPosts, setHideSponsoredPosts] = useState(false);

  // Prevent hydration mismatch and load saved settings
  useEffect(() => {
    setMounted(true);

    // Load saved settings from localStorage with error handling
    if (typeof window !== 'undefined') {
      try {
        const savedHideShoutout = localStorage.getItem('korus-hide-shoutout');

        if (savedHideShoutout) {
          setHideSponsoredPosts(savedHideShoutout === 'true');
        }
      } catch {
        // Failed to load settings from localStorage
      }
    }
  }, []);

  const isDarkMode = useMemo(() => {
    return mounted ? resolvedTheme?.includes('Dark') : true;
  }, [mounted, resolvedTheme]);

  const currentColorScheme = useMemo(() => {
    return mounted ? resolvedTheme?.replace('Dark', '').replace('Light', '') || 'mint' : 'mint';
  }, [mounted, resolvedTheme]);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profileColor, setProfileColor] = useState<string>('#43E97B');

  // Debounced values for localStorage optimization
  const debouncedHideShoutout = useDebounce(hideSponsoredPosts, 500);

  // Debounced localStorage saves to prevent excessive writes
  useEffect(() => {
    if (typeof window !== 'undefined' && mounted) {
      try {
        localStorage.setItem('korus-hide-shoutout', debouncedHideShoutout.toString());
      } catch {
        // Failed to save shoutout preference
      }
    }
  }, [debouncedHideShoutout, mounted]);

  useEffect(() => {
    if (!connected) {
      router.push('/welcome');
    }
  }, [connected, router]);

  // Load user's profile color
  useEffect(() => {
    const fetchProfileColor = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const data = await authAPI.getProfile(token);
        if (data?.themeColor) {
          setProfileColor(data.themeColor);
        }
      } catch {
        // Failed to load profile color
      }
    };

    if (connected && mounted) {
      fetchProfileColor();
    }
  }, [connected, mounted]);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await disconnect();
      router.push('/welcome');
    } catch {
      // Still navigate even if disconnect fails
      router.push('/welcome');
    } finally {
      setIsLoggingOut(false);
    }
  }, [disconnect, router]);

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  }, []);

  // Map theme IDs to their corresponding profile colors
  const themeToProfileColor: Record<string, string> = useMemo(() => ({
    'mint': '#43E97B',
    'purple': '#9945FF',
    'blue': '#00D4FF',
    'gold': '#FFD700',
    'cherry': '#FF6B9D',
    'cyber': '#00FFF0'
  }), []);

  const handleThemeChange = useCallback(async (newTheme: string, themeId?: string) => {
    try {
      if (mounted) {
        setTheme(newTheme);

        // Also update profile color in database to match the theme
        if (themeId) {
          const newProfileColor = themeToProfileColor[themeId];
          if (newProfileColor) {
            const token = localStorage.getItem('authToken');
            if (token) {
              try {
                await authAPI.updateProfile({ themeColor: newProfileColor }, token);
                setProfileColor(newProfileColor);

                // Broadcast theme change to update cached posts
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('themeColorUpdated', {
                    detail: { newColor: newProfileColor }
                  }));
                }
              } catch {
                // Profile color update failed silently — theme still applies locally
              }
            }
          }
          showSuccess('Theme updated successfully!');
        } else {
          showSuccess('Theme updated successfully!');
        }
      }
    } catch {
      // Could add user notification here
    }
  }, [mounted, setTheme, showSuccess, themeToProfileColor]);

  const themes: ThemeOption[] = useMemo(() => [
    { id: 'mint', name: 'Mint Fresh', colors: ['#43e97b', '#38f9d7'], free: true },
    { id: 'purple', name: 'Royal Purple', colors: ['#9945FF', '#E935C1'], free: false },
    { id: 'blue', name: 'Blue Sky', colors: ['#00D4FF', '#5B8DEF'], free: false },
    { id: 'gold', name: 'Premium Gold', colors: ['#FFD700', '#FFA500'], free: false },
    { id: 'cherry', name: 'Cherry Blossom', colors: ['#FF6B9D', '#FF8E9E'], free: false },
    { id: 'cyber', name: 'Cyber Neon', colors: ['#00FFF0', '#FF10F0'], free: false },
  ], []);

  if (!connected) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[var(--color-background)] relative overflow-hidden">
      {/* Standardized static background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[var(--color-background)] via-[var(--color-surface)] to-[var(--color-background)]">
        {/* Surface gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[var(--color-surface)]/25 to-[var(--color-surface)]/35" />
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

      {/* Content wrapper */}
      <div className="relative z-10">
        <div className="flex min-h-screen max-w-[1280px] mx-auto">
          <LeftSidebar onNotificationsToggle={() => setShowNotifications(!showNotifications)} />
          {/* Main Content */}
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
                <h1 className="text-3xl font-bold text-[var(--color-text)]">Settings</h1>
              </div>
            </div>

            {/* Settings Content */}
            <div className="p-6 space-y-6">

              {/* Premium Section */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-xl p-6">
                <h2 className="text-2xl font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
                  Premium Status
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                    <svg className="w-4 h-4" fill="black" viewBox="0 0 24 24">
                      <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                    </svg>
                  </div>
                </h2>
                {isPremium ? (
                  <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl p-4 flex items-center gap-3 white-text">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                      <svg className="w-5 h-5" fill="black" viewBox="0 0 24 24">
                        <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                      </svg>
                    </div>
                    <span className="font-bold text-lg" style={{ color: '#FFD700' }}>PREMIUM MEMBER</span>
                  </div>
                ) : (
                  <div
                    className="bg-white/[0.04] backdrop-blur-sm border border-[var(--color-border-light)] rounded-xl p-4"
                    style={{
                      boxShadow: '0 0 10px var(--korus-primary), 0 0 20px var(--korus-primary)'
                    }}
                  >
                    <div
                      onClick={() => setShowPremiumModal(true)}
                      className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl p-4 w-full font-bold hover:shadow-lg transition-all duration-150 cursor-pointer text-[var(--color-text)] white-text text-center flex items-center justify-center gap-3"
                    >
                      <div>
                        <div>Upgrade to Premium</div>
                        <div className="text-sm mt-1 opacity-90">0.1 SOL/month • 1 SOL/year</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Premium Benefits Description */}
                <div className="mt-4 p-4 bg-white/[0.04] rounded-xl border border-[var(--color-border-light)]">
                  <div className="text-[var(--color-text-secondary)] text-sm space-y-2">
                    <p className="text-yellow-400 font-semibold mb-3">Premium Membership Includes:</p>
                    <div className="space-y-1">
                      <p>• Ad-free browsing with hidden shoutout posts</p>
                      <p>• 5 exclusive color themes (Purple, Blue Sky, Gold, Cherry & Cyber)</p>
                      <p>• Gold verified badge on your profile</p>
                      <p>• Unlimited username changes</p>
                      <p>• Custom SNS domain display names</p>
                      <p>• Priority access to new features and events</p>
                    </div>
                  </div>
                </div>
              </div>


              {/* Appearance Settings */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-xl p-6">
                <h2 className="text-2xl font-bold text-[var(--color-text)] mb-4">Appearance</h2>
                <div className="space-y-4">

                  {/* Dark Mode */}
                  <div className="flex items-center justify-between p-4 bg-white/[0.04] rounded-xl border border-[var(--color-border-light)]">
                    <div>
                      <div className="text-[var(--color-text)] font-medium">Dark Mode</div>
                      <div className="text-[var(--color-text-secondary)] text-sm">Available for all users</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isDarkMode}
                        onChange={(e) => {
                          const newTheme = e.target.checked ? `${currentColorScheme}Dark` : `${currentColorScheme}Light`;
                          handleThemeChange(newTheme);
                        }}
                        className="sr-only"
                        aria-label="Toggle dark mode"
                        role="switch"
                        aria-checked={isDarkMode}
                      />
                      <div className={`toggle-switch ${isDarkMode ? 'toggle-switch-active' : 'toggle-switch-inactive'}`}>
                        <div className={`toggle-switch-thumb ${isDarkMode ? 'toggle-switch-thumb-active' : ''}`}></div>
                      </div>
                    </label>
                  </div>

                  {/* Color Theme */}
                  <div className="p-4 bg-white/[0.04] rounded-xl border border-[var(--color-border-light)]">
                    <div className="text-[var(--color-text)] font-medium mb-3">Color Theme</div>
                    <div className="grid grid-cols-2 gap-3">
                      {themes.map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => {
                            if (!theme.free && !isPremium) {
                              setShowPremiumModal(true);
                              return;
                            }
                            const newTheme = isDarkMode ? `${theme.id}Dark` : `${theme.id}Light`;
                            handleThemeChange(newTheme, theme.id);
                          }}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 ${
                            currentColorScheme === theme.id
                              ? 'border-korus-primary bg-korus-primary/10'
                              : 'border-[var(--color-border-light)] hover:border-[var(--color-border-light)]'
                          }`}
                        >
                          <div
                            className="w-8 h-8 rounded-full"
                            style={{
                              background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})`
                            }}
                          />
                          <div className="flex-1 text-left">
                            <div className="text-[var(--color-text)] text-sm font-medium">{theme.name}</div>
                            {!theme.free && !isPremium && (
                              <div className="text-yellow-400 text-xs">PREMIUM</div>
                            )}
                          </div>
                          {currentColorScheme === theme.id && (
                            <svg className="w-5 h-5 text-korus-primary" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Color */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-xl p-6">
                <h2 className="text-2xl font-bold text-[var(--color-text)] mb-4">Profile Color</h2>
                <div className="p-4 bg-white/[0.04] rounded-xl border border-[var(--color-border-light)]">
                  <div className="text-[var(--color-text)] font-medium mb-2">Your Profile Theme</div>
                  <div className="text-[var(--color-text-secondary)] text-sm mb-4">
                    This color represents you on Korus - it appears on your posts, reposts, and profile. Your profile color automatically matches your chosen Color Theme above, but you can manually override it here if you prefer.
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { name: 'Green', color: '#43E97B' },
                      { name: 'Purple', color: '#9945FF' },
                      { name: 'Orange', color: '#FF6B35' },
                      { name: 'Blue', color: '#00D4FF' },
                      { name: 'Pink', color: '#FF6B9D' },
                      { name: 'Gold', color: '#FFD700' },
                      { name: 'Cyan', color: '#00FFF0' },
                      { name: 'Red', color: '#FF4757' },
                    ].map((colorOption) => {
                      const isSelected = profileColor.toUpperCase() === colorOption.color.toUpperCase();

                      return (
                        <button
                          key={colorOption.color}
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('authToken');
                              if (!token) return;

                              await authAPI.updateProfile({ themeColor: colorOption.color }, token);
                              setProfileColor(colorOption.color);
                              showSuccess(`Profile color updated to ${colorOption.name}!`);
                            } catch {
                              // Error handling
                            }
                          }}
                          className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-150 ${
                            isSelected
                              ? 'border-korus-primary bg-korus-primary/10'
                              : 'border-[var(--color-border-light)] hover:border-[var(--color-border-light)]'
                          }`}
                          title={colorOption.name}
                        >
                          <div className="relative">
                            <div
                              className="w-12 h-12 rounded-full"
                              style={{ background: `linear-gradient(135deg, ${colorOption.color}, ${colorOption.color}dd)` }}
                            />
                            {isSelected && (
                              <svg className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-[var(--color-text)]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                              </svg>
                            )}
                          </div>
                          <span className="text-[var(--color-text-secondary)] text-xs">{colorOption.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Premium Features */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-xl p-6">
                <h2 className="text-2xl font-bold text-[var(--color-text)] mb-4">Premium Features</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/[0.04] rounded-xl border border-[var(--color-border-light)]">
                    <div>
                      <div className="text-[var(--color-text)] font-medium">Hide Shoutout</div>
                      <div className="text-[var(--color-text-secondary)] text-sm">Remove shoutout content from your feed</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isPremium && (
                        <span className="text-xs bg-yellow-500 text-[var(--color-text)] px-2 py-1 rounded-full font-bold">PREMIUM</span>
                      )}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hideSponsoredPosts && isPremium}
                          onChange={(e) => {
                            if (!isPremium) {
                              setShowPremiumModal(true);
                              return;
                            }
                            const newHideShoutoutStatus = e.target.checked;
                            setHideSponsoredPosts(newHideShoutoutStatus);
                            showSuccess(`Shoutout posts ${newHideShoutoutStatus ? 'hidden' : 'shown'}`);
                          }}
                          className="sr-only"
                          disabled={!isPremium}
                          aria-label="Hide shoutout posts (Premium feature)"
                          role="switch"
                          aria-checked={hideSponsoredPosts && isPremium}
                          aria-disabled={!isPremium}
                        />
                        <div className={`toggle-switch ${
                          (hideSponsoredPosts && isPremium) ? 'toggle-switch-active' : 'toggle-switch-inactive'
                        } ${!isPremium ? 'toggle-switch-disabled' : ''}`}>
                          <div className={`toggle-switch-thumb ${
                            (hideSponsoredPosts && isPremium) ? 'toggle-switch-thumb-active' : ''
                          } ${!isPremium ? 'toggle-switch-thumb-disabled' : ''}`}></div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>



              {/* Support & Information */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-xl p-6">
                <h2 className="text-[var(--color-text)] text-xl font-bold mb-4">Support & Information</h2>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowFAQModal(true)}
                    className="flex items-center justify-between p-4 bg-white/[0.04] rounded-xl border border-[var(--color-border-light)] hover:bg-white/[0.06] transition-all duration-150 w-full"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6 text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-[var(--color-text)] font-medium">FAQ</span>
                    </div>
                    <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <button
                    onClick={() => setShowRulesModal(true)}
                    className="flex items-center justify-between p-4 bg-white/[0.04] rounded-xl border border-[var(--color-border-light)] hover:bg-white/[0.06] transition-all duration-150 w-full"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6 text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span className="text-[var(--color-text)] font-medium">Community Rules</span>
                    </div>
                    <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Account */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-xl p-6">
                <h2 className="text-[var(--color-text)] text-xl font-bold mb-4">Account</h2>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="flex items-center justify-between p-4 bg-white/[0.04] rounded-xl border border-[var(--color-border-light)] hover:bg-red-500/20 transition-all duration-150 w-full"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="text-red-400 font-medium">Logout</span>
                  </div>
                  <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <RightSidebar
            showNotifications={showNotifications}
            onNotificationsClose={() => setShowNotifications(false)}
          />
        </div>
      </div>

      {/* Modals */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-[var(--color-overlay-background)] backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] backdrop-blur-xl border border-[var(--color-border-light)] rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <h3 className="text-[var(--color-text)] text-xl font-bold mb-2">Logout from Korus?</h3>
              <p className="text-[var(--color-text-secondary)] mb-6">This will disconnect your wallet and you&apos;ll need to reconnect to use the app again.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2 bg-white/[0.08] text-[var(--color-text)] rounded-xl hover:bg-white/[0.12] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex-1 px-4 py-2 bg-red-600 text-[var(--color-text)] rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoggingOut ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Logging out...
                    </div>
                  ) : (
                    'Logout'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PremiumUpgradeModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onSubscriptionUpdated={refreshStatus}
      />

      {/* FAQ Modal */}
      {showFAQModal && (
        <div
          className="fixed inset-0 bg-[var(--color-overlay-background)] backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowFAQModal(false)}
        >
          <div
            className="bg-[var(--color-surface)] backdrop-blur-xl border border-[var(--color-border-light)] rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[var(--color-text)] text-xl font-bold">Frequently Asked Questions</h3>
              <button
                onClick={() => setShowFAQModal(false)}
                className="w-8 h-8 bg-white/[0.08] rounded-full flex items-center justify-center hover:bg-white/[0.12] transition-colors"
              >
                <svg className="w-5 h-5 text-[var(--color-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-white/[0.04] rounded-xl p-4">
                <h4 className="text-[var(--color-text)] font-semibold mb-2">What is Korus?</h4>
                <p className="text-[var(--color-text-secondary)] text-sm">
                  Korus is a Web3 social platform where authentic conversations meet blockchain innovation. Share thoughts, earn rewards, and connect with a community that values real engagement.
                </p>
              </div>

              <div className="bg-white/[0.04] rounded-xl p-4">
                <h4 className="text-[var(--color-text)] font-semibold mb-2">How do I earn SOL?</h4>
                <p className="text-[var(--color-text-secondary)] text-sm">
                  You earn SOL by receiving tips from other users who appreciate your content. Create valuable posts and engage meaningfully with the community.
                </p>
              </div>

              <div className="bg-white/[0.04] rounded-xl p-4">
                <h4 className="text-[var(--color-text)] font-semibold mb-2">What&apos;s included in Premium?</h4>
                <p className="text-[var(--color-text-secondary)] text-sm">
                  Premium members get exclusive color themes, gold verified badge, ability to use SNS domains as display names, and can hide sponsored posts for a cleaner feed.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Community Rules Modal */}
      {showRulesModal && (
        <div
          className="fixed inset-0 bg-[var(--color-overlay-background)] backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowRulesModal(false)}
        >
          <div
            className="bg-[var(--color-surface)] backdrop-blur-xl border border-[var(--color-border-light)] rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[var(--color-text)] text-xl font-bold">Community Rules</h3>
              <button
                onClick={() => setShowRulesModal(false)}
                className="w-8 h-8 bg-white/[0.08] rounded-full flex items-center justify-center hover:bg-white/[0.12] transition-colors"
              >
                <svg className="w-5 h-5 text-[var(--color-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-white/[0.04] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-korus-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-korus-primary font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="text-[var(--color-text)] font-semibold mb-1">Be Authentic</h4>
                    <p className="text-[var(--color-text-secondary)] text-sm">Share genuine thoughts and experiences. No fake accounts or impersonation.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.04] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-korus-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-korus-primary font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="text-[var(--color-text)] font-semibold mb-1">Respect Everyone</h4>
                    <p className="text-[var(--color-text-secondary)] text-sm">Treat all community members with kindness. No harassment, hate speech, or discrimination.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.04] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-korus-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-korus-primary font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="text-[var(--color-text)] font-semibold mb-1">Quality Over Quantity</h4>
                    <p className="text-[var(--color-text-secondary)] text-sm">Focus on meaningful contributions. Avoid spam, repetitive content, or low-effort posts.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.04] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-korus-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-korus-primary font-bold text-sm">4</span>
                  </div>
                  <div>
                    <h4 className="text-[var(--color-text)] font-semibold mb-1">Protect Privacy</h4>
                    <p className="text-[var(--color-text-secondary)] text-sm">Never share personal information of others. Respect everyone&apos;s privacy and security.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.04] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-korus-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-korus-primary font-bold text-sm">5</span>
                  </div>
                  <div>
                    <h4 className="text-[var(--color-text)] font-semibold mb-1">Stay On Topic</h4>
                    <p className="text-[var(--color-text-secondary)] text-sm">Post content in relevant categories. Keep discussions focused and constructive.</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <p className="text-yellow-400 text-sm font-medium text-center">
                  Violation of these rules may result in content removal or account suspension.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast Notification */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          <div className="bg-[var(--color-surface)] backdrop-blur-xl border border-korus-primary rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-korus-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-[var(--color-text)] font-medium">{successMessage}</span>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}