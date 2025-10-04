'use client';

import Header from '@/components/Header';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';

export default function WalletPage() {
  const { connected, publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
    }
  }, [connected, publicKey]);

  const fetchBalance = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const connection = new Connection('https://api.mainnet-beta.solana.com');
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setLoading(false);
    }
  };

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
          <h2 className="text-3xl font-bold text-white mb-6">Wallet</h2>

          {/* Balance Card */}
          <div className="bg-gradient-to-br from-korus-dark-300 to-korus-dark-400 rounded-2xl p-6 mb-6 border border-korus-primary/30 shadow-[0_0_30px_rgba(67,233,123,0.2)]">
            <div className="text-gray-400 text-sm mb-2">SOL Balance</div>
            <div className="text-4xl font-bold text-white mb-4">
              {loading ? '...' : balance !== null ? `${balance.toFixed(4)} SOL` : '0.0000 SOL'}
            </div>
            <div className="text-gray-500 text-xs font-mono">
              {publicKey?.toString().slice(0, 20)}...{publicKey?.toString().slice(-20)}
            </div>
            <button
              onClick={fetchBalance}
              className="mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-semibold hover:shadow-[0_0_20px_rgba(67,233,123,0.4)] transition-all"
            >
              Refresh Balance
            </button>
          </div>

          {/* Activity Tabs */}
          <div className="flex gap-2 mb-4">
            {['All', 'Tips', 'Games', 'Events'].map((tab) => (
              <button
                key={tab}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-korus-dark-300 text-gray-400 hover:text-white hover:bg-korus-dark-400 transition-all"
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Empty State */}
          <div className="text-center py-20">
            <div className="text-6xl mb-4">💳</div>
            <p className="text-gray-400 text-lg">No activity yet</p>
            <p className="text-gray-500 text-sm mt-2">Your transactions will appear here</p>
          </div>
        </div>

      </div>
    </main>
  );
}
