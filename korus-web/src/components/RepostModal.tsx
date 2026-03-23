'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useToast } from '@/hooks/useToast';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useWalletAuth } from '@/contexts/WalletAuthContext';
import { interactionsAPI } from '@/lib/api/interactions';
import { logger } from '@/utils/logger';

interface RepostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: number;
  postContent: string;
  postUser: string;
  onRepostSuccess?: (comment?: string, response?: unknown) => void;
  onSuccess?: () => void;
}

export default function RepostModal({ isOpen, onClose, postId, postContent, postUser, onRepostSuccess, onSuccess }: RepostModalProps) {
  const { isAuthenticated, token } = useWalletAuth();
  const { connected } = useWallet();
  const { showSuccess, showError } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [comment, setComment] = useState('');
  const modalRef = useFocusTrap(isOpen);

  if (!isOpen) return null;

  // Truncate wallet address for display
  const truncateAddress = (address: string) => {
    if (address.length <= 20) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const displayUser = truncateAddress(postUser);

  const handleRepost = async () => {
    console.log('[RepostModal] handleRepost called, postId:', postId);
    console.log('[RepostModal] connected:', connected, 'isAuthenticated:', isAuthenticated, 'hasToken:', !!token);

    if (!connected || !isAuthenticated || !token) {
      console.error('[RepostModal] Missing auth requirements');
      showError('Please connect your wallet and sign in to repost');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('[RepostModal] Calling backend API - postId:', postId, 'comment:', comment.trim());
      logger.log('Reposting post/reply:', postId);

      // Call backend API to repost
      const response = await interactionsAPI.repostPost(
        String(postId),
        token,
        comment.trim() || undefined
      );

      console.log('[RepostModal] Got response:', response);
      logger.log('Repost response:', response);

      // Call success callbacks - pass the response to the parent
      if (onSuccess) {
        onSuccess();
      }
      if (onRepostSuccess) {
        onRepostSuccess(comment.trim() || undefined, response);
      }

      showSuccess(comment.trim() ? 'Quote reposted successfully!' : 'Reposted successfully!');
      setComment('');
      onClose();
    } catch (error) {
      logger.error('Failed to repost:', error);
      showError('Failed to repost. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget && !isProcessing) onClose(); }}>
      <div ref={modalRef} className="modal-content bg-[#1e1e1e] border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, var(--korus-primary), var(--korus-secondary))', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--korus-primary) 40%, transparent)' }}>
              <svg className="w-6 h-6" fill="none" stroke="#000000" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h2 className="heading-2 text-[#fafafa] font-semibold">Repost</h2>
              <p className="text-sm text-[#a1a1a1]">Share this post with your followers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-9 h-9 rounded-full hover:bg-white/[0.08] text-neutral-400 hover:text-[#fafafa] transition-colors duration-150 flex items-center justify-center disabled:opacity-50"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-5">
          {/* Original Post Preview */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-korus-primary">Original Post</h3>
            <div className="border-2 rounded-xl p-4" style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--korus-primary) 10%, transparent), color-mix(in srgb, var(--korus-secondary) 10%, transparent))', borderColor: 'color-mix(in srgb, var(--korus-primary) 30%, transparent)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'linear-gradient(135deg, var(--korus-primary), var(--korus-secondary))', color: '#000000' }}>
                  {postUser.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-[#fafafa] font-medium truncate">{displayUser}</span>
              </div>
              <p className="text-sm leading-relaxed line-clamp-3 text-[#fafafa]">{postContent}</p>
            </div>
          </div>

          {/* Comment Input */}
          <div>
            <h3 className="label text-[#fafafa] mb-3">Add your thoughts (optional)</h3>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts about this post..."
              maxLength={280}
              className="w-full bg-white/[0.06] border border-white/15 rounded-lg px-3 py-2.5 text-[#fafafa] placeholder-neutral-600 focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none transition-colors resize-none"
              style={{ borderColor: comment ? 'var(--korus-primary)' : '' }}
              rows={4}
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-[#a1a1a1]">{comment.length}/280</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-5 py-3 bg-white/[0.08] border border-white/15 text-[#fafafa] font-semibold rounded-lg hover:bg-white/[0.12] duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleRepost}
            disabled={isProcessing || !connected}
            className="flex-1 px-5 py-3 rounded-lg font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] disabled:hover:scale-100"
            style={{ background: 'linear-gradient(135deg, var(--korus-primary) 0%, var(--korus-secondary) 100%)', color: '#000000', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--korus-primary) 30%, transparent)' }}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="spinner-dark"></div>
                Processing...
              </div>
            ) : !connected ? (
              'Connect Wallet'
            ) : (
              'Repost'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
