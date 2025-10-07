'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useToast } from '@/hooks/useToast';

interface Post {
  id: number;
  user: string;
  content: string;
  likes: number;
  replies: number;
  tips: number;
  time: string;
  isPremium?: boolean;
  isShoutout?: boolean;
  image?: string;
  video?: string;
}

interface ReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  onReplySuccess?: (reply: any) => void;
}

export default function ReplyModal({ isOpen, onClose, post, onReplySuccess }: ReplyModalProps) {
  const { connected, publicKey } = useWallet();
  const { showSuccess, showError } = useToast();
  const [replyContent, setReplyContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  if (!isOpen || !post) return null;

  const handleReply = async () => {
    if (!connected) {
      showError('Please connect your wallet to reply');
      return;
    }

    if (!replyContent.trim()) {
      showError('Please write your reply');
      return;
    }

    setIsPosting(true);

    try {
      // TODO: Implement actual API call to create reply
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create reply object
      const reply = {
        id: Date.now(),
        user: publicKey?.toBase58().slice(0, 15) || 'current_user',
        content: replyContent,
        likes: 0,
        replies: 0,
        tips: 0,
        time: 'now',
        isPremium: false,
        isShoutout: false,
        isSponsored: false,
        image: selectedFiles.length > 0 && selectedFiles[0].type.startsWith('image/') ? URL.createObjectURL(selectedFiles[0]) : null,
        avatar: null,
        isReply: true,
        replyToPost: post
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

  const characterCount = replyContent.length;
  const maxCharacters = 280;
  const isOverLimit = characterCount > maxCharacters;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-korus-surface/90 backdrop-blur-md rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-korus-border shadow-xl">
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
                <span className="font-bold text-white">{post.user}</span>
                {post.isPremium && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                    <svg className="w-3 h-3" fill="black" viewBox="0 0 24 24">
                      <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                    </svg>
                  </div>
                )}
                <span className="text-korus-textSecondary">@{post.user}</span>
                <span className="text-korus-textSecondary">·</span>
                <span className="text-korus-textSecondary">{post.time}</span>
              </div>
              <div className="text-white text-base leading-normal mb-3 whitespace-pre-wrap break-words">
                {post.content}
              </div>
              {post.image && (
                <div className="mb-3 rounded-2xl overflow-hidden border border-korus-border w-2/3">
                  <img src={post.image} alt="Post content" className="w-full h-auto" />
                </div>
              )}
              <div className="text-korus-textSecondary text-sm">
                Replying to <span className="text-korus-primary">@{post.user}</span>
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
                        <img
                          src={URL.createObjectURL(file)}
                          alt="Upload preview"
                          className="w-full h-32 object-cover rounded-xl border border-korus-border"
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
                  <button className="flex items-center justify-center w-10 h-10 bg-korus-surface/40 backdrop-blur-sm border border-korus-borderLight rounded-xl text-korus-primary hover:bg-korus-surface/60 hover:border-korus-border transition-all duration-200 hover:shadow-lg hover:shadow-korus-primary/10">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M16 10h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>

                  {/* Emoji Button */}
                  <button className="flex items-center justify-center w-10 h-10 bg-korus-surface/40 backdrop-blur-sm border border-korus-borderLight rounded-xl text-korus-primary hover:bg-korus-surface/60 hover:border-korus-border transition-all duration-200 hover:shadow-lg hover:shadow-korus-primary/10">
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
                  <button
                    onClick={handleReply}
                    disabled={!replyContent.trim() || isOverLimit || isPosting || !connected}
                    className="px-6 py-2 bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 backdrop-blur-sm"
                  >
                    {isPosting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="spinner-dark"></div>
                        Replying...
                      </div>
                    ) : !connected ? (
                      'Connect Wallet'
                    ) : !replyContent.trim() ? (
                      'Write a reply...'
                    ) : isOverLimit ? (
                      'Too long'
                    ) : (
                      'Reply'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}