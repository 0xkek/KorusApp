'use client';
import Image from 'next/image';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { useToast } from '@/hooks/useToast';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Button } from '@/components/ui';
import { MAX_POST_LENGTH, MAX_FILE_SIZE, MAX_FILES_PER_POST } from '@/constants';
import { postsAPI, uploadAPI } from '@/lib/api';
import type { Post } from '@/types';

const DrawingCanvasInline = dynamic(() => import('@/components/DrawingCanvasInline'), { ssr: false });
const ShoutoutModal = dynamic(() => import('@/components/ShoutoutModal'), { ssr: false });

interface ShoutoutInfo {
  id: number;
  user: string;
  content: string;
  duration: number;
  startTime: number;
  endTime: number;
  price: number;
}

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent?: string;
  onPostCreate?: (post: Post) => void;
  queueInfo?: {
    activeShoutout: ShoutoutInfo | null;
    queuedShoutouts: ShoutoutInfo[];
  };
}

export default function CreatePostModal({ isOpen, onClose, initialContent = '', onPostCreate, queueInfo }: CreatePostModalProps) {
  const { connected, publicKey } = useWallet();
  const { token, isAuthenticated } = useWalletAuth();
  const { showSuccess, showError } = useToast();
  const [content, setContent] = useState(initialContent);
  const [isPosting, setIsPosting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDrawCanvas, setShowDrawCanvas] = useState(false);
  const [showShoutoutModal, setShowShoutoutModal] = useState(false);
  const modalRef = useFocusTrap(isOpen);

  // Update content when initialContent changes
  useEffect(() => {
    if (isOpen && initialContent) {
      setContent(initialContent);
    }
  }, [isOpen, initialContent]);

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      selectedFiles.forEach(file => {
        if (file instanceof File) {
          URL.revokeObjectURL(URL.createObjectURL(file));
        }
      });
    };
  }, [selectedFiles]);

  if (!isOpen) return null;

  const handlePost = async () => {
    if (!connected || !isAuthenticated || !token) {
      showError('Please connect your wallet and sign in to post');
      return;
    }

    if (!content.trim() && selectedFiles.length === 0) {
      showError('Please write some content or add media before posting');
      return;
    }

    setIsPosting(true);

    try {
      // Upload images first if there are any
      let imageUrl: string | undefined;
      if (selectedFiles.length > 0) {
        const imageFile = selectedFiles[0]; // For now, support only one image
        if (imageFile.type.startsWith('image/')) {
          try {
            const uploadResponse = await uploadAPI.uploadImage(imageFile, token);
            imageUrl = uploadResponse.url;
          } catch (uploadError) {
            console.error('Failed to upload image:', uploadError);
            showError('Failed to upload image. Please try again.');
            setIsPosting(false);
            return;
          }
        }
      }

      // Prepare post data
      const postData: { topic: string; content: string; subtopic: string; imageUrl?: string } = {
        topic: 'General', // You can add a category selector later
        content: content.trim() || '', // Default to empty string if no content
        subtopic: 'discussion', // Default subtopic
      };

      // Add image URL if uploaded
      if (imageUrl) {
        postData.imageUrl = imageUrl;
      }

      // Create post via backend API
      const newPost = await postsAPI.createPost(postData, token);

      // Extract the post from the response (backend returns {success: true, post: {...}})
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const post: any = (newPost as { post?: unknown }).post || newPost;

      // Transform the backend response to match the frontend Post type
      const transformedPost = {
        ...post,
        user: post.authorWallet || post.author?.walletAddress || publicKey?.toBase58() || 'Unknown',
        wallet: post.authorWallet,
        time: 'Just now',
        likes: post.likeCount || 0,
        comments: post.replyCount || 0,
        reposts: 0,
        tips: post.tipCount || 0,
        image: post.imageUrl,
      };

      // Call the parent's post creation function
      if (onPostCreate) {
        onPostCreate(transformedPost as Post);
      }

      showSuccess('Post created successfully!');
      setContent('');
      setSelectedFiles([]);
      setShowDrawCanvas(false);
      onClose();
    } catch (error) {
      console.error('Failed to create post:', error);
      showError('Failed to create post. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        showError(`File "${file.name}" is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, MAX_FILES_PER_POST));
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleEmojiSelect = (emoji: string) => {
    setContent(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleDrawingSave = (dataUrl: string) => {
    // Convert data URL to File
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `drawing-${Date.now()}.png`, { type: 'image/png' });
        setSelectedFiles(prev => [...prev, file].slice(0, 4));
        setShowDrawCanvas(false);
        showSuccess('Drawing added!');
      });
  };

  const characterCount = content.length;
  const isOverLimit = characterCount > MAX_POST_LENGTH;

  return (
    <div className="modal-backdrop fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget && !isPosting) onClose(); }}>
      <div ref={modalRef} className="modal-content bg-korus-surface/90 backdrop-blur-md rounded-2xl max-w-2xl w-full border border-korus-border shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-korus-border">
          <h2 className="heading-2 text-white">Create Post</h2>
          <button
            onClick={onClose}
            aria-label="Close create post modal"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-korus-surface/40 border border-korus-borderLight text-korus-textSecondary hover:bg-korus-surface/60 hover:text-white transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {/* User Avatar and Content */}
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center flex-shrink-0 shadow-lg shadow-korus-primary/20">
              <span className="text-black font-bold">
                {publicKey?.toBase58().slice(0, 2).toUpperCase() || 'U'}
              </span>
            </div>

            <div className="flex-1">
              {/* Text Area */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind? Share your experience, ask for advice, or offer support..."
                className={`w-full bg-transparent text-white text-base resize-none placeholder-korus-textTertiary max-h-[300px] ${showDrawCanvas ? 'min-h-[80px]' : 'min-h-[150px]'}`}
                style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                rows={showDrawCanvas ? 3 : 6}
                autoFocus
              />

              {/* Inline Drawing Canvas */}
              {showDrawCanvas && (
                <div className="mt-3 p-3 bg-korus-surface/20 border border-korus-borderLight rounded-xl">
                  <DrawingCanvasInline
                    onSave={handleDrawingSave}
                    onClose={() => setShowDrawCanvas(false)}
                  />
                </div>
              )}

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
                        aria-label="Remove file"
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

              {/* Character Count */}
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
                    <span className="text-xs font-bold">GIF</span>
                  </button>

                  {/* Emoji Button */}
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    aria-label="Add emoji"
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

                  {/* Pen/Draw Button */}
                  <button
                    onClick={() => setShowDrawCanvas(!showDrawCanvas)}
                    aria-label="Add drawing"
                    className={`flex items-center justify-center w-10 h-10 backdrop-blur-sm border rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-korus-primary/10 ${
                      showDrawCanvas
                        ? 'bg-korus-primary/20 border-korus-primary text-korus-primary'
                        : 'bg-korus-surface/40 border-korus-borderLight text-korus-primary hover:bg-korus-surface/60 hover:border-korus-border'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* Shoutout Button */}
                  <button
                    onClick={() => (content.trim() || selectedFiles.length > 0) && setShowShoutoutModal(true)}
                    disabled={!content.trim() && selectedFiles.length === 0}
                    className={`flex items-center gap-2 px-3 py-2 backdrop-blur-sm border rounded-xl transition-all duration-200 ${
                      content.trim() || selectedFiles.length > 0
                        ? 'bg-korus-surface/40 border-korus-borderLight text-korus-primary hover:bg-korus-surface/60 hover:border-korus-border hover:shadow-lg hover:shadow-korus-primary/10 cursor-pointer'
                        : 'bg-korus-surface/20 border-korus-borderLight/50 text-korus-textTertiary cursor-not-allowed opacity-50'
                    }`}
                  >
                    <span className="text-sm font-medium">📢 Shoutout</span>
                  </button>

                  {/* Character Counter */}
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                      isOverLimit
                        ? 'border-red-500 text-red-500'
                        : characterCount > MAX_POST_LENGTH * 0.8
                        ? 'border-yellow-500 text-yellow-500'
                        : 'border-korus-border text-korus-textSecondary'
                    }`}>
                      <span className="text-xs font-medium">
                        {isOverLimit ? `-${characterCount - MAX_POST_LENGTH}` : MAX_POST_LENGTH - characterCount}
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
                        className={isOverLimit ? 'text-red-500' : characterCount > MAX_POST_LENGTH * 0.8 ? 'text-yellow-500' : 'text-korus-primary'}
                        strokeDasharray={`${2 * Math.PI * 10}`}
                        strokeDashoffset={`${2 * Math.PI * 10 * (1 - Math.min(characterCount / MAX_POST_LENGTH, 1))}`}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  {/* Post Button */}
                  <Button
                    onClick={handlePost}
                    disabled={(!content.trim() && selectedFiles.length === 0) || isOverLimit || isPosting || !connected}
                    variant="primary"
                    size="md"
                    isLoading={isPosting}
                  >
                    {!isPosting && (
                      !connected ? 'Connect Wallet' :
                      isOverLimit ? 'Too long' :
                      'Post'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emoji Picker Modal */}
      {showEmojiPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-korus-surface/95 backdrop-blur-md rounded-2xl max-w-md w-full max-h-[80vh] border border-korus-border shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-korus-border">
              <h3 className="text-lg font-bold text-white">Choose Emoji</h3>
              <button
                onClick={() => setShowEmojiPicker(false)}
                aria-label="Close emoji picker"
                className="w-8 h-8 rounded-full flex items-center justify-center bg-korus-surface/40 border border-korus-borderLight text-korus-textSecondary hover:bg-korus-surface/60 hover:text-white transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Emoji Grid */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-8 gap-2">
                {/* Popular Emojis */}
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
                    aria-label={`Insert ${emoji}`}
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

      {/* Shoutout Modal */}
      {showShoutoutModal && (
        <ShoutoutModal
          isOpen={showShoutoutModal}
          onClose={() => setShowShoutoutModal(false)}
          postContent={content}
          queueInfo={queueInfo}
          onConfirm={async (duration, price, transactionSignature) => {
            try {
              setIsPosting(true);

              // Upload image if needed
              let imageUrl: string | undefined;
              if (selectedFiles.length > 0 && selectedFiles[0].type.startsWith('image/')) {
                try {
                  const uploadResponse = await uploadAPI.uploadImage(selectedFiles[0], token!);
                  imageUrl = uploadResponse.url;
                } catch (uploadError) {
                  console.error('Image upload failed:', uploadError);
                  showError('Failed to upload image');
                  setIsPosting(false);
                  return;
                }
              }

              // Create post data with shoutout info
              const postData: { content: string; topic: string; subtopic: string; shoutoutDuration: number; transactionSignature: string; imageUrl?: string } = {
                content: content.trim(),
                topic: 'general',
                subtopic: 'discussion',
                shoutoutDuration: duration,
                transactionSignature,
              };

              // Add image URL if uploaded
              if (imageUrl) {
                postData.imageUrl = imageUrl;
              }

              // Create post via backend API
              const newPost = await postsAPI.createPost(postData, token!);

              // Extract the post from the response
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const post: any = (newPost as { post?: unknown }).post || newPost;

              // Transform the backend response to match the frontend Post type
              const transformedPost = {
                ...post,
                user: post.authorWallet || post.author?.walletAddress || publicKey?.toBase58() || 'Unknown',
                likes: post.likeCount || 0,
                replies: post.replyCount || 0,
                tips: post.tipCount || 0,
                time: 'now',
                isPremium: false,
                isShoutout: true,
                isSponsored: false,
                shoutoutDuration: duration,
                shoutoutStartTime: Date.now(),
              };

              // Call parent's post creation function
              if (onPostCreate) {
                onPostCreate(transformedPost);
              }

              showSuccess(`Shoutout created for ${duration} minutes!`);
              setShowShoutoutModal(false);
              setContent('');
              setSelectedFiles([]);
              setShowDrawCanvas(false);
              onClose();
            } catch (error: unknown) {
              console.error('Failed to create shoutout post:', error);
              showError((error as Error)?.message || 'Failed to create shoutout post');
            } finally {
              setIsPosting(false);
            }
          }}
        />
      )}
    </div>
  );
}