'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';

export default function SettingsPage() {
  const { connected, disconnect } = useWallet();
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [hideSponsoredPosts, setHideSponsoredPosts] = useState(false);
  const [hideGamePosts, setHideGamePosts] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showAdsModal, setShowAdsModal] = useState(false);
  const [colorScheme, setColorScheme] = useState('mint');

  useEffect(() => {
    if (!connected) {
      router.push('/welcome');
    }
  }, [connected, router]);

  const handleLogout = async () => {
    try {
      await disconnect();
      router.push('/welcome');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const themes = [
    { id: 'mint', name: 'Mint Fresh', colors: ['#43e97b', '#38f9d7'], free: true },
    { id: 'purple', name: 'Royal Purple', colors: ['#BB73E0', '#A055D6'], free: false },
    { id: 'blue', name: 'Ocean Blue', colors: ['#4A90E2', '#7B68EE'], free: false },
    { id: 'gold', name: 'Premium Gold', colors: ['#FFD700', '#FFA500'], free: false },
    { id: 'cherry', name: 'Cherry Blossom', colors: ['#FF6B9D', '#FF8E9E'], free: false },
    { id: 'cyber', name: 'Cyber Neon', colors: ['#00FFF0', '#FF10F0'], free: false },
  ];

  if (!connected) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-korus-dark-100 to-black relative overflow-hidden">
      {/* Background gradients */}
      <div className="fixed inset-0">
        <div className="absolute -top-40 -right-40 w-[1000px] h-[1000px] bg-korus-primary/15 rounded-full blur-[140px] animate-float" />
        <div className="absolute -bottom-40 -left-40 w-[900px] h-[900px] bg-korus-secondary/12 rounded-full blur-[120px] animate-float-delayed" />
        <div className="absolute top-1/3 left-1/3 w-[800px] h-[800px] bg-korus-accent/10 rounded-full blur-[100px] animate-float-slow" />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10">
        <div className="flex min-h-screen">
          {/* Main Content */}
          <div className="flex-1 lg:ml-80 lg:mr-96 md:ml-64 md:mr-80 sm:ml-0 sm:mr-0 md:border-x md:border-korus-border bg-korus-surface/10 backdrop-blur-sm max-w-full overflow-hidden">

            {/* Header */}
            <div className="sticky top-0 bg-korus-dark-300/80 backdrop-blur-xl border-b border-korus-border z-10 p-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="w-10 h-10 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center text-black font-bold hover:shadow-lg transition-all duration-200"
                >
                  ←
                </button>
                <h1 className="text-white text-2xl font-bold">Settings</h1>
              </div>
            </div>

            {/* Settings Content */}
            <div className="p-6 space-y-6">

              {/* Premium Section */}
              <div className="bg-korus-surface/30 backdrop-blur-sm border border-korus-borderLight rounded-2xl p-6">
                <h2 className="text-white text-xl font-bold mb-4">Premium Status</h2>
                {isPremium ? (
                  <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl p-4 flex items-center gap-3">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <span className="text-white font-bold text-lg">PREMIUM MEMBER</span>
                  </div>
                ) : (
                  <div
                    onClick={() => setShowPremiumModal(true)}
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl p-4 w-full font-bold hover:shadow-lg transition-all duration-200 cursor-pointer text-white white-text"
                  >
                    Upgrade to Premium - $4.99/month
                  </div>
                )}
              </div>


              {/* Appearance Settings */}
              <div className="bg-korus-surface/30 backdrop-blur-sm border border-korus-borderLight rounded-2xl p-6">
                <h2 className="text-white text-xl font-bold mb-4">Appearance</h2>
                <div className="space-y-4">

                  {/* Dark Mode */}
                  <div className="flex items-center justify-between p-4 bg-korus-surface/20 rounded-xl border border-korus-borderLight">
                    <div>
                      <div className="text-white font-medium">Dark Mode</div>
                      <div className="text-gray-400 text-sm">Available for all users</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isDarkMode}
                        onChange={(e) => setIsDarkMode(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-korus-primary"></div>
                    </label>
                  </div>

                  {/* Color Theme */}
                  <div className="p-4 bg-korus-surface/20 rounded-xl border border-korus-borderLight">
                    <div className="text-white font-medium mb-3">Color Theme</div>
                    <div className="grid grid-cols-2 gap-3">
                      {themes.map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => {
                            if (!theme.free && !isPremium) {
                              setShowPremiumModal(true);
                              return;
                            }
                            setColorScheme(theme.id);
                          }}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                            colorScheme === theme.id
                              ? 'border-korus-primary bg-korus-primary/10'
                              : 'border-korus-borderLight hover:border-korus-border'
                          }`}
                        >
                          <div
                            className="w-8 h-8 rounded-full"
                            style={{
                              background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})`
                            }}
                          />
                          <div className="flex-1 text-left">
                            <div className="text-white text-sm font-medium">{theme.name}</div>
                            {!theme.free && !isPremium && (
                              <div className="text-yellow-400 text-xs">PREMIUM</div>
                            )}
                          </div>
                          {colorScheme === theme.id && (
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

              {/* Premium Features */}
              <div className="bg-korus-surface/30 backdrop-blur-sm border border-korus-borderLight rounded-2xl p-6">
                <h2 className="text-white text-xl font-bold mb-4">Premium Features</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-korus-surface/20 rounded-xl border border-korus-borderLight">
                    <div>
                      <div className="text-white font-medium">Hide Sponsored Posts</div>
                      <div className="text-gray-400 text-sm">Remove sponsored content from your feed</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isPremium && (
                        <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded-full font-bold">PREMIUM</span>
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
                            setHideSponsoredPosts(e.target.checked);
                          }}
                          className="sr-only peer"
                          disabled={!isPremium}
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-korus-primary peer-disabled:opacity-50"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Preferences */}
              <div className="bg-korus-surface/30 backdrop-blur-sm border border-korus-borderLight rounded-2xl p-6">
                <h2 className="text-white text-xl font-bold mb-4">Content Preferences</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-korus-surface/20 rounded-xl border border-korus-borderLight">
                    <div>
                      <div className="text-white font-medium">Hide Game Posts</div>
                      <div className="text-gray-400 text-sm">Remove mini game posts from your feed</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hideGamePosts}
                        onChange={(e) => setHideGamePosts(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-korus-primary"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Debug Options */}
              <div className="bg-korus-surface/30 backdrop-blur-sm border border-korus-borderLight rounded-2xl p-6">
                <h2 className="text-white text-xl font-bold mb-4">Debug Options</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-korus-surface/20 rounded-xl border border-korus-borderLight">
                    <div>
                      <div className="text-white font-medium">Toggle Premium Status</div>
                      <div className="text-gray-400 text-sm">For testing premium features</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPremium}
                        onChange={(e) => setIsPremium(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-korus-primary"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Support & Information */}
              <div className="bg-korus-surface/30 backdrop-blur-sm border border-korus-borderLight rounded-2xl p-6">
                <h2 className="text-white text-xl font-bold mb-4">Support & Information</h2>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowFAQModal(true)}
                    className="flex items-center justify-between p-4 bg-korus-surface/20 rounded-xl border border-korus-borderLight hover:bg-korus-surface/40 transition-all duration-200 w-full"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6 text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-white font-medium">FAQ</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <button
                    onClick={() => setShowRulesModal(true)}
                    className="flex items-center justify-between p-4 bg-korus-surface/20 rounded-xl border border-korus-borderLight hover:bg-korus-surface/40 transition-all duration-200 w-full"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6 text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span className="text-white font-medium">Community Rules</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <button
                    onClick={() => setShowAdsModal(true)}
                    className="flex items-center justify-between p-4 bg-korus-surface/20 rounded-xl border border-korus-borderLight hover:bg-korus-surface/40 transition-all duration-200 w-full"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6 text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                      <span className="text-white font-medium">Advertise with Korus</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Account */}
              <div className="bg-korus-surface/30 backdrop-blur-sm border border-korus-borderLight rounded-2xl p-6">
                <h2 className="text-white text-xl font-bold mb-4">Account</h2>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="flex items-center justify-between p-4 bg-korus-surface/20 rounded-xl border border-korus-borderLight hover:bg-red-500/20 transition-all duration-200 w-full"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="text-red-400 font-medium">Logout</span>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-korus-surface/90 backdrop-blur-xl border border-korus-border rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <h3 className="text-white text-xl font-bold mb-2">Logout from Korus?</h3>
              <p className="text-gray-400 mb-6">This will disconnect your wallet and you'll need to reconnect to use the app again.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2 bg-korus-surface/40 text-white rounded-xl hover:bg-korus-surface/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPremiumModal && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setShowPremiumModal(false)}
        >
          <div
            className="bg-korus-surface/90 backdrop-blur-xl border border-korus-primary rounded-2xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 white-text">
                {/* Outline Star - User's choice */}
                <svg className="w-8 h-8" style={{ color: '#FFD700' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: '#FFD700' }}>Unlock Premium</h3>
              <p className="text-gray-400 mb-6">Get exclusive features with Korus Premium</p>

              <div className="space-y-3 mb-6 text-left">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  <span className="text-white">Hide sponsored posts</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  <span className="text-white">Exclusive color themes</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  <span className="text-white">Gold verified badge</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  <span className="text-white">Early access to events</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPremiumModal(false)}
                  className="flex-1 px-4 py-2 bg-korus-surface/40 text-white rounded-xl hover:bg-korus-surface/60 transition-colors"
                >
                  Maybe Later
                </button>
                <button
                  onClick={() => {
                    setIsPremium(true);
                    setShowPremiumModal(false);
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 white-text"
                >
                  Subscribe $4.99/month
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <LeftSidebar />
      <RightSidebar />
    </main>
  );
}