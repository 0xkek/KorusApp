'use client';
import { logger } from '@/utils/logger';
import Image from 'next/image';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { useToast } from '@/hooks/useToast';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { Button } from '@/components/ui';
import { repliesAPI, uploadAPI } from '@/lib/api';
import type { Post, Reply } from '@/types/post';

interface ReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  onReplySuccess?: (reply: Reply) => void;
}

export default function ReplyModal({ isOpen, onClose, post, onReplySuccess }: ReplyModalProps) {
  const { connected, publicKey } = useWallet();
  const { token, isAuthenticated } = useWalletAuth();
  const { showSuccess, showError } = useToast();
  const [replyContent, setReplyContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const modalRef = useFocusTrap(isOpen);

  if (!isOpen || !post) return null;

  // Truncate wallet address for display
  const truncateAddress = (address: string) => {
    if (!address || address.length <= 20) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const handleReply = async () => {
    if (!connected || !isAuthenticated || !token) {
      showError('Please connect your wallet and sign in to reply');
      return;
    }

    if (!replyContent.trim()) {
      showError('Please write your reply');
      return;
    }

    setIsPosting(true);

    try {
      // Upload image if present
      let imageUrl: string | undefined;
      if (selectedFiles.length > 0) {
        const imageFile = selectedFiles[0];
        if (imageFile.type.startsWith('image/')) {
          logger.log('Uploading reply image...');
          const uploadResponse = await uploadAPI.uploadImage(imageFile, token);
          imageUrl = uploadResponse.url;
          logger.log('Reply image uploaded:', imageUrl);
        }
      }

      // Create reply via backend API
      // Check if we're replying to a post or a reply
      const isReplyToReply = 'postId' in post && post.postId;
      const targetPostId = isReplyToReply ? String(post.postId) : String(post.id);
      const parentReplyId = isReplyToReply ? String(post.id) : undefined;

      if (!targetPostId) {
        throw new Error('Invalid post ID');
      }

      const response = await repliesAPI.createReply(
        targetPostId,
        {
          content: replyContent.trim(),
          imageUrl,
          parentReplyId
        },
        token
      );

      logger.log('Reply created:', response);

      // Transform backend reply to match frontend type
      const reply: Reply = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        id: response.reply.id as any,
        user: response.reply.author.walletAddress,
        content: response.reply.content,
        likes: response.reply.likeCount || 0,
        replies: [],
        time: 'Just now',
        isPremium: false,
        image: response.reply.imageUrl
      };

      // Call success callback
      if (onReplySuccess) {
        onReplySuccess(reply);
      }

      showSuccess('Reply posted successfully!');
      setReplyContent('');
      setSelectedFiles([]);
      onClose();
    } catch (error) {
      logger.error('Failed to post reply:', error);
      showError('Failed to post reply. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const maxFileSize = 10 * 1024 * 1024; // 10MB in bytes

    const validFiles = files.filter(file => {
      if (file.size > maxFileSize) {
        showError(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 4));
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleEmojiSelect = (emoji: string) => {
    setReplyContent(prev => prev + emoji);
    setShowEmojiPicker(false);
  };


  const characterCount = replyContent.length;
  const maxCharacters = 300;
  const isOverLimit = characterCount > maxCharacters;

  return (
    <div className="modal-backdrop fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="modal-content bg-korus-surface/90 backdrop-blur-md rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-korus-border shadow-xl">
        {/* Modal Header */}
        <div className="sticky top-0 bg-korus-surface/90 backdrop-blur-md flex items-center justify-between p-6 border-b border-korus-border">
          <h2 className="heading-2 text-white">Reply</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-korus-surface/40 border border-korus-borderLight text-korus-textSecondary hover:bg-korus-surface/60 hover:text-white transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Original Post */}
        <div className="p-6 border-b border-korus-border">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center text-lg font-bold text-black flex-shrink-0">
              {post.user.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-white">{truncateAddress(post.user)}</span>
                {post.isPremium && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                    <svg className="w-3 h-3" fill="black" viewBox="0 0 24 24">
                      <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                    </svg>
                  </div>
                )}
                <span className="text-korus-textSecondary">@{truncateAddress(post.user)}</span>
                <span className="text-korus-textSecondary">·</span>
                <span className="text-korus-textSecondary">{post.time}</span>
              </div>
              <div className="text-white text-base leading-normal mb-3 whitespace-pre-wrap break-words">
                {post.content}
              </div>
              {post.image && (
                <div className="mb-3 rounded-2xl overflow-hidden border border-korus-border w-2/3">
                  <Image src={post.image} alt="Post content" width={400} height={300} className="w-full h-auto" />
                </div>
              )}
              <div className="text-korus-textSecondary text-sm">
                Replying to <span className="text-korus-primary">@{truncateAddress(post.user)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reply Compose */}
        <div className="p-6">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center flex-shrink-0 shadow-lg shadow-korus-primary/20">
              <span className="text-black font-bold">
                {publicKey?.toBase58().slice(0, 2).toUpperCase() || 'U'}
              </span>
            </div>

            <div className="flex-1">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Post your reply"
                className="w-full bg-transparent text-white text-lg resize-none outline-none placeholder-korus-textTertiary min-h-[80px] max-h-[120px]"
                rows={3}
                autoFocus
              />

              {/* File Previews */}
              {selectedFiles.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      {file.type.startsWith('image/') ? (
                        <Image
                          src={URL.createObjectURL(file)}
                          alt="Upload preview"
                          width={200}
                          height={128}
                          className="w-full object-cover rounded-xl border border-korus-border"
                        />
                      ) : (
                        <div className="w-full h-32 bg-korus-surface/40 border border-korus-border rounded-xl flex items-center justify-center">
                          <div className="text-center">
                            <svg className="w-8 h-8 mx-auto mb-2 text-korus-textSecondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-xs text-korus-textSecondary truncate">{file.name}</p>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Actions */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  {/* Media Upload */}
                  <label className="flex items-center justify-center w-10 h-10 bg-korus-surface/40 backdrop-blur-sm border border-korus-borderLight rounded-xl text-korus-primary hover:bg-korus-surface/60 hover:border-korus-border transition-all duration-200 hover:shadow-lg hover:shadow-korus-primary/10 cursor-pointer">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileSelect}
                    />
                  </label>

                  {/* GIF Button */}
                  <button
                    onClick={() => setShowGifPicker(!showGifPicker)}
                    className={`flex items-center justify-center w-10 h-10 backdrop-blur-sm border rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-korus-primary/10 ${
                      showGifPicker
                        ? 'bg-korus-primary/20 border-korus-primary text-korus-primary'
                        : 'bg-korus-surface/40 border-korus-borderLight text-korus-primary hover:bg-korus-surface/60 hover:border-korus-border'
                    }`}
                  >
                    <span className="text-xs font-bold">GIF</span>
                  </button>

                  {/* Emoji Button */}
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`flex items-center justify-center w-10 h-10 backdrop-blur-sm border rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-korus-primary/10 ${
                      showEmojiPicker
                        ? 'bg-korus-primary/20 border-korus-primary text-korus-primary'
                        : 'bg-korus-surface/40 border-korus-borderLight text-korus-primary hover:bg-korus-surface/60 hover:border-korus-border'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M16 10h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  {/* Character Counter */}
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                      isOverLimit
                        ? 'border-red-500 text-red-500'
                        : characterCount > maxCharacters * 0.8
                        ? 'border-yellow-500 text-yellow-500'
                        : 'border-korus-border text-korus-textSecondary'
                    }`}>
                      <span className="text-xs font-medium">
                        {isOverLimit ? `-${characterCount - maxCharacters}` : maxCharacters - characterCount}
                      </span>
                    </div>

                    {/* Progress Circle */}
                    <svg className="w-6 h-6 transform -rotate-90" viewBox="0 0 24 24">
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        className="text-korus-border"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        className={isOverLimit ? 'text-red-500' : characterCount > maxCharacters * 0.8 ? 'text-yellow-500' : 'text-korus-primary'}
                        strokeDasharray={`${2 * Math.PI * 10}`}
                        strokeDashoffset={`${2 * Math.PI * 10 * (1 - Math.min(characterCount / maxCharacters, 1))}`}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  {/* Reply Button */}
                  <Button
                    onClick={handleReply}
                    disabled={!replyContent.trim() || isOverLimit || isPosting || !connected}
                    variant="primary"
                    isLoading={isPosting}
                  >
                    {!connected ? (
                      'Connect Wallet'
                    ) : !replyContent.trim() ? (
                      'Write a reply...'
                    ) : isOverLimit ? (
                      'Too long'
                    ) : (
                      'Reply'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emoji Picker - Nested within backdrop */}
      {showEmojiPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowEmojiPicker(false)}>
          <div className="bg-korus-surface/95 backdrop-blur-md rounded-2xl max-w-md w-full max-h-[80vh] border border-korus-border shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-korus-border">
              <h3 className="text-lg font-bold text-white">Choose Emoji</h3>
              <button
                onClick={() => setShowEmojiPicker(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-korus-surface/40 border border-korus-borderLight text-korus-textSecondary hover:bg-korus-surface/60 hover:text-white transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-8 gap-2">
                {['😀', '😂', '🤣', '😊', '😍', '🥰', '😘', '🤔', '😎', '😢', '😭', '😡', '🤯', '🥳', '😴', '🤤',
                  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '👋', '🤚', '🖐️', '✋', '👏', '🙌', '🤝', '🙏', '✊',
                  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
                  '🎉', '🎊', '🎈', '🎁', '🎂', '🎄', '🎃', '✨', '🎯', '🎪', '🎨', '🎭', '🎬', '🎮', '🎵', '🎶',
                  '🔥', '💯', '💫', '⭐', '🌟', '⚡', '💥', '💨', '🌈', '☀️', '🌙', '⭐', '🌊', '🌍', '🌎', '🌏',
                  '💰', '💸', '💵', '💎', '🚀', '📈', '📉', '💹', '🏦', '💳', '⚖️', '🎯', '✅', '❌', '⚠️', '💯',
                  '🍕', '🍔', '🍟', '🌭', '🍿', '🧂', '🥓', '🍳', '🧀', '🥞', '🧇', '🍞', '🥖', '🥨', '🥯', '🥐',
                  '☕', '🍵', '🧃', '🥤', '🍻', '🍷', '🥂', '🍾', '🍸', '🍹', '🍺', '🥃', '🥛', '🧋', '🧊', '🍯'].map((emoji, index) => (
                  <button
                    key={`emoji-${index}-${emoji}`}
                    onClick={() => handleEmojiSelect(emoji)}
                    className="w-10 h-10 text-xl hover:bg-korus-surface/60 rounded-lg transition-colors flex items-center justify-center hover:scale-110 transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GIF Picker - Nested within backdrop */}
      {showGifPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowGifPicker(false)}>
          <div className="bg-korus-surface/95 backdrop-blur-md rounded-2xl max-w-2xl w-full max-h-[80vh] border border-korus-border shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-korus-border">
              <h3 className="text-lg font-bold text-white">Choose GIF</h3>
              <button
                onClick={() => setShowGifPicker(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-korus-surface/40 border border-korus-borderLight text-korus-textSecondary hover:bg-korus-surface/60 hover:text-white transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎬</div>
                <p className="text-korus-text text-lg font-medium">GIF Integration Coming Soon</p>
                <p className="text-korus-textSecondary text-sm mt-2">
                  We&apos;ll integrate with Tenor or Giphy API to bring you the best GIFs
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}