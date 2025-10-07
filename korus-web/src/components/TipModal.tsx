'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useToast } from '@/hooks/useToast';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientUser: string;
  postId?: number;
  onTipSuccess?: () => void;
}

export default function TipModal({ isOpen, onClose, recipientUser, postId, onTipSuccess }: TipModalProps) {
  const { connected, publicKey } = useWallet();
  const { showSuccess, showError } = useToast();
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const presetAmounts = [0.01, 0.05, 0.1, 0.25, 0.5, 1.0];

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCustomAmount(value);
      setSelectedAmount(null);
    }
  };

  const getFinalAmount = (): number => {
    if (selectedAmount !== null) return selectedAmount;
    return parseFloat(customAmount) || 0;
  };

  const handleSendTip = async () => {
    if (!connected) {
      showError('Please connect your wallet to send tips');
      return;
    }

    const amount = getFinalAmount();
    if (amount <= 0) {
      showError('Please enter a valid tip amount');
      return;
    }

    if (amount < 0.001) {
      showError('Minimum tip amount is 0.001 SOL');
      return;
    }

    setIsSending(true);

    try {
      // TODO: Implement actual Solana transaction
      // For now, just simulate the tip sending
      await new Promise(resolve => setTimeout(resolve, 2000));

      showSuccess(`Successfully sent ${amount} SOL tip to ${recipientUser}!`);

      // Call the success callback to mark post as tipped
      if (onTipSuccess) {
        onTipSuccess();
      }

      // Reset form
      setSelectedAmount(null);
      setCustomAmount('');
      setMessage('');
      onClose();
    } catch (error) {
      showError('Failed to send tip. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const getCurrentBalance = () => {
    // TODO: Implement actual balance fetching
    return 2.45; // Mock balance
  };

  const balance = getCurrentBalance();
  const finalAmount = getFinalAmount();
  const isInsufficientFunds = finalAmount > balance;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget && !isSending) onClose(); }}>
      <div className="bg-korus-surface/95 backdrop-blur-xl rounded-2xl max-w-md w-full border border-korus-border shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-korus-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, var(--korus-primary), var(--korus-secondary))', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--korus-primary) 40%, transparent)' }}>
              <span className="text-2xl">💰</span>
            </div>
            <div>
              <h2 className="heading-2 text-white">Send Tip</h2>
              <p className="text-sm text-korus-textSecondary">to {recipientUser}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSending}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-korus-surface/60 text-korus-textSecondary hover:text-white transition-all duration-200 disabled:opacity-50"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-5">
          {/* Balance Display */}
          {connected && (
            <div className="flex items-center justify-between p-3 rounded-xl border" style={{ backgroundColor: 'color-mix(in srgb, var(--korus-primary) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--korus-primary) 30%, transparent)' }}>
              <span className="text-sm text-korus-textSecondary">Your Balance</span>
              <span className="text-base font-bold text-korus-primary">{balance.toFixed(3)} SOL</span>
            </div>
          )}

          {/* Preset Amounts */}
          <div>
            <h3 className="label text-white mb-3">Quick Amounts</h3>
            <div className="grid grid-cols-3 gap-2">
              {presetAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleAmountSelect(amount)}
                  className="relative p-2.5 rounded-lg border transition-all duration-200"
                  style={{
                    backgroundColor: selectedAmount === amount ? 'color-mix(in srgb, var(--korus-primary) 20%, transparent)' : 'rgba(26, 26, 26, 0.4)',
                    borderColor: selectedAmount === amount ? 'var(--korus-primary)' : 'color-mix(in srgb, var(--korus-primary) 20%, transparent)'
                  }}
                >
                  <div className="text-xs font-medium text-white mb-1">{amount} SOL</div>
                  <div className="text-[10px] text-korus-textSecondary">${(amount * 200).toFixed(0)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <h3 className="label text-white mb-3">Custom Amount</h3>
            <div className="relative">
              <input
                type="text"
                value={customAmount}
                onChange={handleCustomAmountChange}
                placeholder="0.0"
                className="w-full bg-korus-surface/40 text-white text-lg font-medium pl-4 pr-16 py-3 rounded-xl border border-korus-borderLight focus:outline-none transition-colors"
                style={{ borderColor: customAmount ? 'var(--korus-primary)' : '' }}
              />
              <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-korus-textSecondary font-medium">
                SOL
              </span>
            </div>
            {customAmount && (
              <p className="text-xs text-korus-textSecondary mt-1">
                ≈ ${(parseFloat(customAmount) * 200).toFixed(2)} USD
              </p>
            )}
          </div>

          {/* Transaction Summary */}
          {finalAmount > 0 && (
            <div className="p-4 border-2 rounded-xl shadow-lg" style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--korus-primary) 10%, transparent), color-mix(in srgb, var(--korus-secondary) 10%, transparent))', borderColor: 'color-mix(in srgb, var(--korus-primary) 30%, transparent)', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--korus-primary) 10%, transparent)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-korus-textSecondary">Tip Amount</span>
                <span className="text-sm font-bold text-white">{finalAmount.toFixed(3)} SOL</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-korus-textSecondary">Network Fee</span>
                <span className="text-sm font-bold text-white">~0.0005 SOL</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'color-mix(in srgb, var(--korus-primary) 30%, transparent)' }}>
                <span className="text-base font-bold text-korus-primary">Total</span>
                <span className="text-2xl font-black text-korus-primary" style={{ filter: 'drop-shadow(0 0 8px color-mix(in srgb, var(--korus-primary) 50%, transparent))' }}>{(finalAmount + 0.0005).toFixed(4)} SOL</span>
              </div>
            </div>
          )}

          {/* Error Messages */}
          {isInsufficientFunds && finalAmount > 0 && (
            <div className="p-3.5 border-2 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="#f87171" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#f87171' }}>Insufficient Balance</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(252, 165, 165, 0.8)' }}>You need {(finalAmount - balance).toFixed(3)} more SOL to send this tip.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-5 border-t border-korus-border">
          <button
            onClick={onClose}
            disabled={isSending}
            className="flex-1 px-5 py-3 bg-korus-surface/60 border border-korus-borderLight text-korus-text font-semibold rounded-xl hover:bg-korus-surface/80 hover:border-korus-border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSendTip}
            disabled={finalAmount <= 0 || isSending || isInsufficientFunds || !connected}
            className="flex-1 px-5 py-3 rounded-xl font-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] disabled:hover:scale-100"
            style={{ background: 'linear-gradient(135deg, var(--korus-primary) 0%, var(--korus-secondary) 100%)', color: '#000000', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--korus-primary) 30%, transparent)' }}
          >
            {isSending ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0, 0, 0, 0.3)', borderTopColor: '#000000' }}></div>
                Processing...
              </div>
            ) : !connected ? (
              'Connect Wallet'
            ) : finalAmount <= 0 ? (
              'Select Amount'
            ) : isInsufficientFunds ? (
              'Insufficient Balance'
            ) : (
              'Send Tip for ' + finalAmount.toFixed(3) + ' SOL'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}