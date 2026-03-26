'use client';
import { logger } from '@/utils/logger';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { useWalletAuth } from '@/contexts/WalletAuthContext';
import { useToast } from '@/hooks/useToast';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { Button } from '@/components/ui';
import { interactionsAPI } from '@/lib/api';

// Helper to call RPC via server-side proxy (uses correct mainnet endpoint)
async function rpcCall(method: string, params: unknown[]) {
  const response = await fetch('/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'RPC error');
  return data.result;
}

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientUser: string;
  postId?: number | string;
  onTipSuccess?: (amount: number) => void;
}

export default function TipModal({ isOpen, onClose, recipientUser, postId, onTipSuccess }: TipModalProps) {
  const { connected, publicKey, signTransaction } = useWallet();
  const { token, isAuthenticated } = useWalletAuth();
  const { showError } = useToast();
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [balance, setBalance] = useState<number>(0);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [successAmount, setSuccessAmount] = useState(0);
  const [txSignature, setTxSignature] = useState('');
  const modalRef = useFocusTrap(isOpen);

  // Fetch wallet balance via server-side RPC proxy (uses correct mainnet endpoint)
  const fetchBalance = async () => {
    if (!publicKey) return;
    try {
      const res = await fetch('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [publicKey.toBase58()],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setBalance((data.result?.value ?? 0) / LAMPORTS_PER_SOL);
    } catch (error) {
      logger.error('Failed to fetch balance:', error);
    }
  };

  useEffect(() => {
    if (isOpen && connected && publicKey) {
      fetchBalance();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, connected, publicKey]);

  // Reset success screen when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowSuccessScreen(false);
      setSuccessAmount(0);
      setTxSignature('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Truncate wallet address for display
  const truncateAddress = (address: string) => {
    if (address.length <= 20) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const displayUser = truncateAddress(recipientUser);

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
      setValidationError(''); // Clear error on change

      // Validate amount
      const amount = parseFloat(value);
      if (value && amount < 0.001) {
        setValidationError('Minimum tip amount is 0.001 SOL');
      } else if (value && amount > balance) {
        setValidationError(`Insufficient balance. You have ${balance.toFixed(3)} SOL`);
      }
    }
  };

  const getFinalAmount = (): number => {
    if (selectedAmount !== null) return selectedAmount;
    return parseFloat(customAmount) || 0;
  };

  const handleSendTip = async () => {
    if (!connected || !publicKey || !signTransaction) {
      showError('Please connect your wallet to send tips');
      return;
    }

    if (!token || !isAuthenticated) {
      showError('Please authenticate to send tips');
      return;
    }

    if (!postId) {
      showError('Invalid post ID');
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
      // Create and validate recipient public key
      let recipientPubkey: PublicKey;
      try {
        recipientPubkey = new PublicKey(recipientUser);
      } catch {
        showError('Invalid recipient wallet address');
        setIsSending(false);
        return;
      }

      // Get latest blockhash via proxy
      const blockhashResult = await rpcCall('getLatestBlockhash', [{ commitment: 'finalized' }]);
      const blockhash = blockhashResult.value.blockhash;
      const lastValidBlockHeight = blockhashResult.value.lastValidBlockHeight;

      // Create transaction
      const transaction = new Transaction();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports: Math.floor(amount * LAMPORTS_PER_SOL),
        })
      );

      if (!signTransaction) {
        throw new Error('Wallet does not support signing transactions');
      }

      // Sign the transaction via wallet
      const signedTransaction = await signTransaction(transaction);

      // Send the signed transaction via proxy
      const rawTransaction = signedTransaction.serialize();
      const base64Tx = Buffer.from(rawTransaction).toString('base64');
      const signature: string = await rpcCall('sendTransaction', [base64Tx, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 5,
        encoding: 'base64',
      }]);

      // Poll for confirmation via proxy
      const maxRetries = 30;
      for (let i = 0; i < maxRetries; i++) {
        const statusResult = await rpcCall('getSignatureStatuses', [[signature]]);
        const status = statusResult?.value?.[0];
        if (status) {
          if (status.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
          }
          if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
            break;
          }
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Record tip in backend
      await interactionsAPI.tipPost(
        String(postId),
        amount,
        signature,
        token
      );

      // Refresh balance
      await fetchBalance();

      // Call the success callback with the amount
      if (onTipSuccess) {
        onTipSuccess(amount);
      }

      // Show success screen
      setSuccessAmount(amount);
      setTxSignature(signature);
      setShowSuccessScreen(true);

      // Reset form
      setSelectedAmount(null);
      setCustomAmount('');
    } catch (error: unknown) {
      logger.error('Failed to send tip:', error);

      // Improved error handling for better user feedback
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('User rejected')) {
        showError('Transaction cancelled. You can try again anytime.');
      } else if (errorMessage.includes('insufficient')) {
        showError('Insufficient balance for this transaction.');
      } else if (errorMessage.includes('blockhash')) {
        showError('Transaction timed out. Please try again.');
      } else if (error instanceof Error) {
        showError(`Failed to send tip: ${error.message}`);
      } else {
        showError('Failed to send tip. Please try again.');
      }
    } finally {
      setIsSending(false);
    }
  };

  const finalAmount = getFinalAmount();
  const isInsufficientFunds = finalAmount > balance;

  return (
    <div className="modal-backdrop fixed inset-0 bg-[var(--color-overlay-background)] backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget && !isSending) onClose(); }}>
      <div ref={modalRef} className="modal-content bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-2xl shadow-2xl max-w-md w-full">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border-light)]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, var(--korus-primary), var(--korus-secondary))', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--korus-primary) 40%, transparent)' }}>
              <span className="text-2xl">💰</span>
            </div>
            <div>
              <h2 className="heading-2 text-[var(--color-text)] font-semibold">Send Tip</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">to {displayUser}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSending}
            className="w-9 h-9 rounded-full hover:bg-white/[0.08] text-neutral-400 hover:text-[var(--color-text)] transition-colors duration-150 flex items-center justify-center disabled:opacity-50"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        {showSuccessScreen ? (
          /* Success Screen */
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-once shadow-2xl" style={{ boxShadow: '0 20px 40px -10px color-mix(in srgb, var(--korus-primary) 60%, transparent)' }}>
              <svg className="w-10 h-10 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            </div>

            <h3 className="text-2xl font-semibold text-[var(--color-text)] mb-2">Tip Sent Successfully!</h3>
            <p className="text-[var(--color-text-secondary)] mb-6">
              You sent <span className="text-korus-primary font-bold">{successAmount.toFixed(3)} SOL</span> to {truncateAddress(recipientUser)}
            </p>

            <div className="bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--color-text-secondary)]">Transaction</span>
                <a
                  href={`https://solscan.io/tx/${txSignature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-korus-primary hover:text-korus-secondary transition-colors flex items-center gap-1"
                >
                  View on Solscan
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
              <div className="text-xs text-[var(--color-text-tertiary)] font-mono break-all">
                {txSignature}
              </div>
            </div>

            <Button
              onClick={onClose}
              variant="primary"
              className="w-full"
            >
              Close
            </Button>
          </div>
        ) : (
        <div className="p-5 space-y-5">
          {/* Balance Display */}
          {connected && (
            <div className="flex items-center justify-between p-3 rounded-xl border" style={{ backgroundColor: 'color-mix(in srgb, var(--korus-primary) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--korus-primary) 30%, transparent)' }}>
              <span className="text-sm text-[var(--color-text-secondary)]">Your Balance</span>
              <span className="text-base font-bold text-korus-primary">{balance.toFixed(3)} SOL</span>
            </div>
          )}

          {/* Preset Amounts */}
          <div>
            <h3 className="label text-[var(--color-text)] mb-3">Quick Amounts</h3>
            <div className="grid grid-cols-3 gap-2">
              {presetAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleAmountSelect(amount)}
                  className="relative p-2.5 rounded-lg border transition-all duration-150"
                  style={{
                    backgroundColor: selectedAmount === amount ? 'color-mix(in srgb, var(--korus-primary) 20%, transparent)' : 'rgba(26, 26, 26, 0.4)',
                    borderColor: selectedAmount === amount ? 'var(--korus-primary)' : 'color-mix(in srgb, var(--korus-primary) 20%, transparent)'
                  }}
                >
                  <div className="text-sm font-medium text-[var(--color-text)]">{amount} SOL</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <h3 className="label text-[var(--color-text)] mb-3">Custom Amount</h3>
            <div className="relative">
              <input
                type="text"
                value={customAmount}
                onChange={handleCustomAmountChange}
                placeholder="0.0"
                className="w-full bg-white/[0.06] text-[var(--color-text)] text-lg font-medium pl-4 pr-16 py-3 rounded-lg border border-[var(--color-border-light)] focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none transition-colors"
                style={{ borderColor: customAmount ? 'var(--korus-primary)' : '' }}
              />
              <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[var(--color-text-secondary)] font-medium">
                SOL
              </span>
            </div>
            {validationError && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                {validationError}
              </p>
            )}
          </div>

          {/* Transaction Summary */}
          {finalAmount > 0 && (
            <div className="p-4 border-2 rounded-xl shadow-lg" style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--korus-primary) 10%, transparent), color-mix(in srgb, var(--korus-secondary) 10%, transparent))', borderColor: 'color-mix(in srgb, var(--korus-primary) 30%, transparent)', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--korus-primary) 10%, transparent)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--color-text-secondary)]">Tip Amount</span>
                <span className="text-sm font-bold text-[var(--color-text)]">{finalAmount.toFixed(3)} SOL</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--color-text-secondary)]">Network Fee</span>
                <span className="text-sm font-bold text-[var(--color-text)]">~0.0005 SOL</span>
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

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 mt-6 border-t border-[var(--color-border-light)]">
            <Button
              onClick={onClose}
              disabled={isSending}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendTip}
              disabled={finalAmount <= 0 || isSending || isInsufficientFunds || !connected || !!validationError}
              variant="primary"
              isLoading={isSending}
              className="flex-1"
            >
              {!isSending && (
                !connected ? 'Connect Wallet' :
                validationError ? 'Invalid Amount' :
                finalAmount <= 0 ? 'Select Amount' :
                isInsufficientFunds ? 'Insufficient Balance' :
                `Send Tip for ${finalAmount.toFixed(3)} SOL`
              )}
            </Button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}