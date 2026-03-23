'use client';
import { logger } from '@/utils/logger';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useToast } from '@/hooks/useToast';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { postsAPI } from '@/lib/api/posts';

interface PostOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: number | string;
  postUser: string;
  isOwnPost: boolean;
  onDelete?: () => void;
}

export default function PostOptionsModal({ isOpen, onClose, isOwnPost, postId, onDelete }: PostOptionsModalProps) {
  const { connected } = useWallet();
  const { showSuccess, showError } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const modalRef = useFocusTrap(isOpen);

  if (!isOpen) return null;

  const handleReport = async () => {
    if (!connected) {
      showError('Please connect your wallet to report posts');
      return;
    }

    setIsProcessing(true);
    try {
      // TODO: Implement actual API call to report post
      await new Promise(resolve => setTimeout(resolve, 1000));

      showSuccess('Post reported successfully. Our moderation team will review it.');
      onClose();
    } catch {
      showError('Failed to report post. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!connected) {
      showError('Please connect your wallet to delete posts');
      return;
    }

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        showError('Please sign in to delete posts');
        return;
      }

      // Call backend API to delete post
      await postsAPI.deletePost(String(postId), token);

      showSuccess('Post deleted successfully');

      // Call the onDelete callback to update the UI
      if (onDelete) {
        onDelete();
      }

      onClose();
    } catch (error) {
      logger.error('Failed to delete post:', error);
      showError('Failed to delete post. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Render report confirmation modal (similar to mobile app)
  if (!isOwnPost) {
    return (
      <div className="modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div ref={modalRef} className="modal-content bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl shadow-2xl max-w-md w-full border-2 shadow-xl shadow-red-500/20" style={{borderColor: '#ef4444'}}>
          <div className="p-6 text-center">
            {/* Warning Icon */}
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 className="heading-1 text-[#fafafa] mb-4">Report Post?</h2>

            {/* Message */}
            <p className="text-[#a1a1a1] text-base leading-relaxed mb-8">
              Are you sure you want to report this post? Our moderation team will review it for violations of community guidelines.
            </p>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1 py-4 px-6 bg-white/[0.08] border border-[#2a2a2a] text-[#fafafa] font-semibold rounded-lg hover:bg-white/[0.12] duration-150 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                disabled={isProcessing}
                className="flex-1 py-4 px-6 bg-red-500 text-white rounded-lg hover:bg-red-600 duration-150 disabled:opacity-50 disabled:hover:scale-100 font-semibold"
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="spinner-light"></div>
                    Reporting...
                  </div>
                ) : (
                  'Report'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render delete confirmation modal for own posts
  return (
    <div className="modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="modal-content bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl shadow-2xl max-w-md w-full border-2 shadow-xl shadow-red-500/20" style={{borderColor: '#ef4444'}}>
        <div className="p-6 text-center">
          {/* Delete Icon */}
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="heading-1 text-[#fafafa] mb-4">Delete Post?</h2>

          {/* Message */}
          <p className="text-[#a1a1a1] text-base leading-relaxed mb-8">
            Are you sure you want to delete this post? This action cannot be undone.
          </p>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 py-4 px-6 bg-white/[0.08] border border-[#2a2a2a] text-[#fafafa] font-semibold rounded-lg hover:bg-white/[0.12] duration-150 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isProcessing}
              className="flex-1 py-4 px-6 bg-red-500 text-white rounded-lg hover:bg-red-600 duration-150 disabled:opacity-50 disabled:hover:scale-100 font-semibold"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="spinner-light"></div>
                  Deleting...
                </div>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}