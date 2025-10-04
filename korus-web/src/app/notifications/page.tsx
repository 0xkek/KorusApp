'use client';

import Header from '@/components/Header';
import { useWallet } from '@solana/wallet-adapter-react';

export default function NotificationsPage() {
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
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-white">Notifications</h2>
            <button className="text-korus-primary text-sm font-semibold hover:underline">
              Mark all read
            </button>
          </div>

          {/* Empty State */}
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔔</div>
            <p className="text-gray-400 text-lg">No notifications yet</p>
            <p className="text-gray-500 text-sm mt-2">When you get likes, replies, or tips, they&apos;ll show up here</p>
          </div>
        </div>

      </div>
    </main>
  );
}
