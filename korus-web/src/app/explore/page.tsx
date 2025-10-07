'use client';

import Header from '@/components/Header';
import { useWallet } from '@solana/wallet-adapter-react';

export default function ExplorePage() {
  const { connected } = useWallet();

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-korus-dark-100 to-black relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="fixed inset-0">
        <div className="absolute -top-40 -right-40 w-[1000px] h-[1000px] bg-korus-primary/15 rounded-full blur-[140px] animate-float" />
        <div className="absolute -bottom-40 -left-40 w-[900px] h-[900px] bg-korus-secondary/12 rounded-full blur-[120px] animate-float-delayed" />
      </div>

      <div className="relative z-10">
        <Header />

        <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
          <h2 className="text-3xl font-bold text-white mb-6">Explore</h2>

          {/* Search Bar Placeholder */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search Korus..."
              className="w-full bg-korus-dark-300 text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-korus-primary border border-korus-dark-400"
            />
          </div>

          {/* Coming Soon */}
          <div className="text-center py-20">
            <p className="text-korus-textSecondary text-lg">Search & Explore - Coming Soon</p>
          </div>
        </div>

      </div>
    </main>
  );
}
