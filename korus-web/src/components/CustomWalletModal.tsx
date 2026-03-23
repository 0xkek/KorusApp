'use client';
import Image from 'next/image';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletReadyState, type WalletName } from '@solana/wallet-adapter-base';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export const CustomWalletModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { wallets, select } = useWallet();
  const modalRef = useFocusTrap(open);

  if (!open) return null;

  // Filter for Solana wallets we want to show
  const allowedWalletNames = ['Phantom', 'Solflare', 'Backpack', 'Jupiter'];
  const solanaWallets = wallets.filter(wallet =>
    allowedWalletNames.includes(wallet.adapter.name)
  );

  // Separate installed and not installed wallets
  const installedWallets = solanaWallets.filter(
    wallet => wallet.readyState === WalletReadyState.Installed
  );
  const notInstalledWallets = solanaWallets.filter(
    wallet => wallet.readyState !== WalletReadyState.Installed
  );

  const handleWalletClick = async (walletName: WalletName) => {
    select(walletName);
    onClose();
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div ref={modalRef} className="modal-content relative z-10 bg-[#1e1e1e] border border-[#222222] rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full hover:bg-white/[0.08] text-neutral-400 hover:text-[#fafafa] transition-colors duration-150 flex items-center justify-center"
          aria-label="Close modal"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        <h2 className="heading-1 text-[#fafafa] mb-2">
          Connect a wallet on Solana to continue
        </h2>

        {/* Installed Wallets Section */}
        {installedWallets.length > 0 && (
          <div className="mt-6">
            <h3 className="label text-[#a1a1a1] mb-3">Installed</h3>
            <div className="space-y-3">
              {installedWallets.map((wallet) => (
                <button
                  key={wallet.adapter.name}
                  onClick={() => handleWalletClick(wallet.adapter.name)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-black border-2 border-transparent hover:shadow-[0_0_30px_rgba(67,233,123,0.4)] hover:-translate-y-1 transition-all"
                  style={{
                    backgroundImage: `
                      linear-gradient(#0a0a0a, #0a0a0a),
                      linear-gradient(135deg, var(--korus-primary) 0%, var(--korus-secondary) 100%)
                    `,
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box',
                  }}
                >
                  {/* Wallet icon */}
                  {wallet.adapter.icon && (
                    <Image
                      src={wallet.adapter.icon}
                      alt={wallet.adapter.name}
                      width={40}
                      height={40}
                      className="rounded-lg"
                    />
                  )}

                  {/* Wallet name with gradient */}
                  <span
                    className="text-lg font-semibold flex-1 text-left"
                    style={{
                      background: 'linear-gradient(135deg, var(--korus-primary) 0%, var(--korus-secondary) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {wallet.adapter.name}
                  </span>

                  {/* Detected badge */}
                  <span
                    className="text-sm font-medium"
                    style={{
                      background: 'linear-gradient(135deg, var(--korus-primary) 0%, var(--korus-secondary) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Detected
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Not Installed Wallets Section */}
        {notInstalledWallets.length > 0 && (
          <div className="mt-6">
            {installedWallets.length > 0 && (
              <h3 className="label text-[#a1a1a1] mb-3">Available Wallets</h3>
            )}
            <div className="space-y-3">
              {notInstalledWallets.map((wallet) => (
                <button
                  key={wallet.adapter.name}
                  onClick={() => handleWalletClick(wallet.adapter.name)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-black border-2 border-transparent hover:shadow-[0_0_30px_rgba(67,233,123,0.4)] hover:-translate-y-1 transition-all"
                  style={{
                    backgroundImage: `
                      linear-gradient(#0a0a0a, #0a0a0a),
                      linear-gradient(135deg, var(--korus-primary) 0%, var(--korus-secondary) 100%)
                    `,
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box',
                  }}
                >
                  {/* Wallet icon */}
                  {wallet.adapter.icon && (
                    <Image
                      src={wallet.adapter.icon}
                      alt={wallet.adapter.name}
                      width={40}
                      height={40}
                      className="rounded-lg"
                    />
                  )}

                  {/* Wallet name with gradient */}
                  <span
                    className="text-lg font-semibold flex-1 text-left"
                    style={{
                      background: 'linear-gradient(135deg, var(--korus-primary) 0%, var(--korus-secondary) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {wallet.adapter.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-[#222222] text-center">
          <p className="text-[#a1a1a1] text-sm mb-3">New to Solana?</p>
          <a
            href="https://phantom.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-korus-primary hover:text-korus-secondary transition-colors text-sm"
          >
            Download Phantom Wallet →
          </a>
        </div>
      </div>
    </div>
  );
};
