'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useToast } from '@/hooks/useToast';

const SHOUTOUT_OPTIONS = [
  { label: '10 min', value: 10, price: 0.10, recommended: false },
  { label: '20 min', value: 20, price: 0.20, recommended: false },
  { label: '30 min', value: 30, price: 0.30, recommended: false },
  { label: '1 hour', value: 60, price: 0.60, recommended: false },
  { label: '2 hours', value: 120, price: 1.20, recommended: true },
  { label: '3 hours', value: 180, price: 1.80, recommended: false },
  { label: '4 hours', value: 240, price: 2.40, recommended: false },
  { label: '6 hours', value: 360, price: 3.60, recommended: false },
];

interface ShoutoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  postContent: string;
  onConfirm?: (duration: number, price: number) => void;
}

export default function ShoutoutModal({ isOpen, onClose, postContent, onConfirm }: ShoutoutModalProps) {
  const { connected, publicKey } = useWallet();
  const { showSuccess, showError } = useToast();
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedDuration(null);
      setWalletBalance(2.45);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isProcessing) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen) return null;

  const selectedOption = SHOUTOUT_OPTIONS.find(opt => opt.value === selectedDuration);
  const hasInsufficientFunds = selectedOption && walletBalance !== null && selectedOption.price > walletBalance;

  const handleConfirm = async () => {
    if (!connected) {
      showError('Please connect your wallet to create a shoutout');
      return;
    }
    if (!selectedDuration) {
      showError('Please select a duration for your shoutout');
      return;
    }
    if (hasInsufficientFunds) {
      showError('Insufficient balance to create this shoutout');
      return;
    }
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      onConfirm?.(selectedDuration, selectedOption?.price || 0);
      showSuccess('Shoutout created! Your post will be featured for ' + selectedOption?.label + '.');
      onClose();
    } catch (error) {
      showError('Failed to create shoutout. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget && !isProcessing) onClose(); }}>
      <div className="bg-korus-surface/95 backdrop-blur-xl rounded-2xl max-w-lg w-full border border-korus-border shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-korus-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, var(--korus-primary), var(--korus-secondary))', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--korus-primary) 40%, transparent)' }}>
              <span className="text-2xl">📢</span>
            </div>
            <div>
              <h2 className="heading-2 text-white">Boost Your Post</h2>
              <p className="text-sm text-korus-textSecondary">Get your message seen by everyone - pin to the top of the feed!</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isProcessing} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-korus-surface/60 text-korus-textSecondary hover:text-white transition-all duration-200 disabled:opacity-50" aria-label="Close modal">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-5 space-y-5">
          {connected && walletBalance !== null && (
            <div className="flex items-center justify-between p-3 rounded-xl border" style={{ backgroundColor: 'color-mix(in srgb, var(--korus-primary) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--korus-primary) 30%, transparent)' }}>
              <span className="text-sm text-korus-textSecondary">Your Balance</span>
              <span className="text-base font-bold text-korus-primary">{walletBalance.toFixed(3)} SOL</span>
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-korus-primary">Your Post Preview</h3>
            <div className="border-2 rounded-xl p-4 shadow-lg" style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--korus-primary) 10%, transparent), color-mix(in srgb, var(--korus-secondary) 10%, transparent))', borderColor: 'color-mix(in srgb, var(--korus-primary) 30%, transparent)', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--korus-primary) 10%, transparent)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-black tracking-widest text-korus-primary">⭐ FEATURED</span>
                <svg className="w-3.5 h-3.5" fill="var(--korus-primary)" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              </div>
              <p className="text-sm leading-relaxed line-clamp-3 text-korus-text">{postContent}</p>
            </div>
          </div>
          <div>
            <h3 className="label text-white mb-3">Choose Duration</h3>
            <div className="grid grid-cols-3 gap-2">
              {SHOUTOUT_OPTIONS.map((option) => {
                const isSelected = selectedDuration === option.value;
                const canAfford = !walletBalance || option.price <= walletBalance;
                return (
                  <button key={option.value} onClick={() => setSelectedDuration(option.value)} disabled={!canAfford} className="relative p-2.5 rounded-lg border transition-all duration-200" style={{ backgroundColor: isSelected ? 'color-mix(in srgb, var(--korus-primary) 20%, transparent)' : 'rgba(26, 26, 26, 0.4)', borderColor: isSelected ? 'var(--korus-primary)' : 'color-mix(in srgb, var(--korus-primary) 20%, transparent)', opacity: canAfford ? 1 : 0.5, cursor: canAfford ? 'pointer' : 'not-allowed' }}>
                    {option.recommended && (<div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black" style={{ background: 'linear-gradient(90deg, var(--korus-primary), var(--korus-secondary))', color: '#000000' }}>BEST</div>)}
                    <div className="text-xs font-medium text-white mb-1">{option.label}</div>
                    <div className="text-sm font-bold text-korus-primary">{option.price.toFixed(2)} SOL</div>
                    {!canAfford && (<div className="absolute inset-0 rounded-lg flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}><span className="text-[10px] font-bold" style={{ color: '#f87171' }}>Low Balance</span></div>)}
                  </button>
                );
              })}
            </div>
          </div>
          {selectedOption && (
            <div className="p-4 border-2 rounded-xl shadow-lg" style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--korus-primary) 10%, transparent), color-mix(in srgb, var(--korus-secondary) 10%, transparent))', borderColor: 'color-mix(in srgb, var(--korus-primary) 30%, transparent)', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--korus-primary) 10%, transparent)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-korus-textSecondary">Duration</span>
                <span className="text-sm font-bold text-white">{selectedOption.label}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-korus-textSecondary">Cost</span>
                <span className="text-sm font-bold text-white">{selectedOption.price.toFixed(2)} SOL</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'color-mix(in srgb, var(--korus-primary) 30%, transparent)' }}>
                <span className="text-base font-bold text-korus-primary">Total</span>
                <span className="text-2xl font-black text-korus-primary" style={{ filter: 'drop-shadow(0 0 8px color-mix(in srgb, var(--korus-primary) 50%, transparent))' }}>{selectedOption.price.toFixed(2)} SOL</span>
              </div>
            </div>
          )}
          {hasInsufficientFunds && (
            <div className="p-3.5 border-2 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="#f87171" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#f87171' }}>Insufficient Balance</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(252, 165, 165, 0.8)' }}>You need {(selectedOption.price - (walletBalance || 0)).toFixed(3)} more SOL to create this shoutout.</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 p-5 border-t border-korus-border">
          <button onClick={onClose} disabled={isProcessing} className="flex-1 px-5 py-3 bg-korus-surface/60 border border-korus-borderLight text-korus-text font-semibold rounded-xl hover:bg-korus-surface/80 hover:border-korus-border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
          <button onClick={handleConfirm} disabled={!selectedDuration || isProcessing || hasInsufficientFunds || !connected} className="flex-1 px-5 py-3 rounded-xl font-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] disabled:hover:scale-100" style={{ background: 'linear-gradient(135deg, var(--korus-primary) 0%, var(--korus-secondary) 100%)', color: '#000000', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--korus-primary) 30%, transparent)' }}>
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0, 0, 0, 0.3)', borderTopColor: '#000000' }}></div>
                Processing...
              </div>
            ) : !connected ? (
              'Connect Wallet'
            ) : !selectedDuration ? (
              'Select Duration'
            ) : hasInsufficientFunds ? (
              'Insufficient Balance'
            ) : (
              'Boost for ' + (selectedOption?.price.toFixed(2) || '0.00') + ' SOL'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
