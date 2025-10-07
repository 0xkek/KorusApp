'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useToast } from '@/hooks/useToast';

interface RepostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: number;
  postContent: string;
  postUser: string;
  onRepostSuccess?: (comment?: string) => void;
}

export default function RepostModal({ isOpen, onClose, postId, postContent, postUser, onRepostSuccess }: RepostModalProps) {
  const { connected, publicKey } = useWallet();
  const { showSuccess, showError } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  const handleRepost = async () => {
    if (!connected) {
      showError('Please connect your wallet to repost');
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate repost
      await new Promise(resolve => setTimeout(resolve, 800));

      // Call success callback with comment if provided
      if (onRepostSuccess) {
        onRepostSuccess(comment.trim() || undefined);
      }

      showSuccess(comment.trim() ? 'Quote reposted successfully!' : 'Reposted successfully!');
      setComment('');
      onClose();
    } catch (error) {
      showError('Failed to repost. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget && !isProcessing) onClose(); }}>
      <div className="bg-korus-surface/95 backdrop-blur-xl rounded-2xl max-w-lg w-full border border-korus-border shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-korus-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, var(--korus-primary), var(--korus-secondary))', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--korus-primary) 40%, transparent)' }}>
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h2 className="heading-2 text-white">Repost</h2>
              <p className="text-sm text-korus-textSecondary">Share this post with your followers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
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
          {/* Original Post Preview */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-korus-primary">Original Post</h3>
            <div className="border-2 rounded-xl p-4" style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--korus-primary) 10%, transparent), color-mix(in srgb, var(--korus-secondary) 10%, transparent))', borderColor: 'color-mix(in srgb, var(--korus-primary) 30%, transparent)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-black" style={{ background: 'linear-gradient(135deg, var(--korus-primary), var(--korus-secondary))' }}>
                  {postUser.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-white font-medium">{postUser}</span>
              </div>
              <p className="text-sm leading-relaxed line-clamp-3 text-korus-text">{postContent}</p>
            </div>
          </div>

          {/* Comment Input */}
          <div>
            <h3 className="label text-white mb-3">Add your thoughts (optional)</h3>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts about this post..."
              maxLength={280}
              className="w-full bg-korus-surface/40 text-white pl-4 pr-4 py-3 rounded-xl border border-korus-borderLight focus:outline-none transition-colors resize-none"
              style={{ borderColor: comment ? 'var(--korus-primary)' : '' }}
              rows={4}
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-korus-textSecondary">{comment.length}/280</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-5 border-t border-korus-border">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-5 py-3 bg-korus-surface/60 border border-korus-borderLight text-korus-text font-semibold rounded-xl hover:bg-korus-surface/80 hover:border-korus-border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleRepost}
            disabled={isProcessing || !connected}
            className="flex-1 px-5 py-3 rounded-xl font-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] disabled:hover:scale-100"
            style={{ background: 'linear-gradient(135deg, var(--korus-primary) 0%, var(--korus-secondary) 100%)', color: '#000000', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--korus-primary) 30%, transparent)' }}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0, 0, 0, 0.3)', borderTopColor: '#000000' }}></div>
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
