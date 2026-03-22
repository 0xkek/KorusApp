'use client';
import { logger } from '@/utils/logger';

import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useWalletAuth } from '@/contexts/WalletAuthContext';
import { useToast } from '@/hooks/useToast';
import { useSubscription } from '@/hooks/useSubscription';
import { subscriptionAPI } from '@/lib/api';

interface PremiumUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: (plan: 'monthly' | 'yearly') => void;
  onSuccess?: () => void;
  onSubscriptionUpdated?: () => void;
}

const PREMIUM_FEATURES = [
  'Hide shoutout posts',
  'Exclusive color themes',
  'Gold verified badge',
  'Early access to events',
  '+20% rep score',
];

const SUBSCRIPTION_PRICES = {
  monthly: 0.1,
  yearly: 1.0
};

// Treasury wallet - same as used for shoutouts/tips
const PLATFORM_WALLET = process.env.NEXT_PUBLIC_TREASURY_WALLET || 'ByqqYGErKfyLHHd3NjgMnbbxQdPs1kFrPVWPUHUsD31W';

export default function PremiumUpgradeModal({ isOpen, onClose, onUpgrade, onSuccess, onSubscriptionUpdated }: PremiumUpgradeModalProps) {
  const modalRef = useFocusTrap(isOpen);
  const { connected, publicKey, sendTransaction, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { token, isAuthenticated } = useWalletAuth();
  const { showSuccess, showError } = useToast();
  const { isPremium, subscriptionStatus } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    // If custom onUpgrade handler provided, use it
    if (onUpgrade) {
      onClose();
      onUpgrade(plan);
      return;
    }

    // Otherwise, implement the full payment flow
    if (!connected || !publicKey || !sendTransaction) {
      showError('Please connect your wallet to upgrade to premium');
      return;
    }

    if (!token || !isAuthenticated) {
      showError('Please authenticate to upgrade to premium');
      return;
    }

    setIsProcessing(true);

    try {
      const amount = SUBSCRIPTION_PRICES[plan];

      // Create recipient public key
      const recipientPubkey = new PublicKey(PLATFORM_WALLET);

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports: Math.floor(amount * LAMPORTS_PER_SOL),
        })
      );

      // Get latest blockhash with commitment
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Try to use signTransaction if available, otherwise fall back to sendTransaction
      let signature: string;

      if (signTransaction) {
        // Sign the transaction
        const signedTransaction = await signTransaction(transaction);

        // Serialize and send the signed transaction
        const rawTransaction = signedTransaction.serialize();
        signature = await connection.sendRawTransaction(rawTransaction, {
          skipPreflight: false,
          maxRetries: 3
        });
      } else {
        // Fall back to sendTransaction (auto-signs and sends)
        signature = await sendTransaction(transaction, connection);
      }

      // Wait for confirmation with timeout protection
      logger.log('⏳ Waiting for transaction confirmation...');
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
      logger.log('✅ Transaction confirmed!');

      // Process subscription on backend
      logger.log('📡 Calling backend API to activate subscription...');
      const result = await subscriptionAPI.subscribe(plan, signature, token);
      logger.log('📦 Backend response:', result);

      if (result.success) {
        showSuccess(
          `Successfully upgraded to ${plan} premium! You now have access to all premium features.`
        );

        // Refresh subscription status
        if (onSubscriptionUpdated) {
          onSubscriptionUpdated();
        }

        // Call success callback if provided
        if (onSuccess) {
          onSuccess();
        }

        onClose();
      } else {
        showError('Failed to activate subscription. Please contact support.');
      }
    } catch (error: unknown) {
      logger.error('Failed to upgrade to premium:', error);

      // Improved error handling
      if ((error as Error)?.message?.includes('User rejected')) {
        showError('Transaction cancelled. You can try again anytime.');
      } else if ((error as Error)?.message?.includes('insufficient')) {
        showError('Insufficient balance for this subscription.');
      } else if ((error as Error)?.message?.includes('blockhash')) {
        showError('Transaction timed out. Please try again.');
      } else if (error instanceof Error) {
        showError(`Failed to upgrade: ${error.message}`);
      } else {
        showError('Failed to upgrade to premium. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-korus-surface/90 backdrop-blur-xl border border-korus-primary rounded-2xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          {/* Premium Icon - Exact copy from profile badge */}
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#FACC15' }}>
            <svg className="w-8 h-8" viewBox="0 0 24 24" style={{ fill: '#000000' }}>
              <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
            </svg>
          </div>

          {/* Header */}
          <h3 className="text-xl font-bold mb-2 text-yellow-400">
            {isPremium ? 'You\'re Premium!' : 'Unlock Premium'}
          </h3>
          <p className="text-korus-textSecondary mb-6">
            {isPremium
              ? 'You already have access to all premium features'
              : 'Get exclusive features with Korus Premium'
            }
          </p>

          {/* Features List */}
          <div className="space-y-3 mb-6 text-left">
            {PREMIUM_FEATURES.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <span className="text-korus-text">{feature}</span>
              </div>
            ))}
          </div>

          {/* Pricing Options or Already Premium Message */}
          {isPremium ? (
            <div className="space-y-4">
              {/* Subscription Info */}
              {subscriptionStatus && (
                <div className="bg-korus-surface/40 border border-korus-borderLight rounded-xl p-4 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-korus-textSecondary text-sm">Subscription Type:</span>
                    <span className="text-white font-medium capitalize">{subscriptionStatus.type || 'Premium'}</span>
                  </div>
                  {subscriptionStatus.daysUntilExpiration !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-korus-textSecondary text-sm">Days Remaining:</span>
                      <span className="text-white font-medium">{subscriptionStatus.daysUntilExpiration} days</span>
                    </div>
                  )}
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-full px-4 py-3 bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Monthly Plan */}
              <button
                onClick={() => handleUpgrade('monthly')}
                disabled={isProcessing}
                className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 white-text rounded-xl hover:shadow-lg transition-all duration-200 border border-korus-border disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  boxShadow: '0 0 4px var(--korus-primary), 0 0 8px var(--korus-primary)'
                }}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <>
                    <div className="font-bold">Monthly - 0.1 SOL</div>
                    <div className="text-sm opacity-90">Paid monthly</div>
                  </>
                )}
              </button>

              {/* Yearly Plan */}
              <button
                onClick={() => handleUpgrade('yearly')}
                disabled={isProcessing}
                className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 white-text rounded-xl hover:shadow-lg transition-all duration-200 relative border border-korus-border disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  boxShadow: '0 0 4px var(--korus-primary), 0 0 8px var(--korus-primary)'
                }}
              >
                {!isProcessing && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                    SAVE 2 MONTHS
                  </div>
                )}
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <>
                    <div className="font-bold">Yearly - 1 SOL</div>
                    <div className="text-sm opacity-90">Paid annually</div>
                  </>
                )}
              </button>

              {/* Cancel Button */}
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="w-full px-4 py-2 bg-korus-surface/40 text-korus-text rounded-xl hover:bg-korus-surface/60 transition-colors border border-korus-border disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  boxShadow: '0 0 3px var(--korus-primary), 0 0 6px var(--korus-primary)'
                }}
              >
                Maybe Later
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
