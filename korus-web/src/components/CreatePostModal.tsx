'use client';
import { logger } from '@/utils/logger';
import Image from 'next/image';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { useToast } from '@/hooks/useToast';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useWalletAuth } from '@/contexts/WalletAuthContext';
import { Button } from '@/components/ui';
import { MAX_POST_LENGTH, MAX_FILE_SIZE, MAX_FILES_PER_POST } from '@/constants';
import { postsAPI, uploadAPI } from '@/lib/api';
import { compressImage } from '@/utils/imageCompression';
import type { Post } from '@/types';

const DrawingCanvasInline = dynamic(() => import('@/components/DrawingCanvasInline'), { ssr: false });
const ShoutoutModal = dynamic(() => import('@/components/ShoutoutModal'), { ssr: false });

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent?: string;
  onPostCreate?: (post: Post) => void;
  queueInfo?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeShoutout: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queuedShoutouts: any[];
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
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [showDrawCanvas, setShowDrawCanvas] = useState(false);
  const [showShoutoutModal, setShowShoutoutModal] = useState(false);
  const modalRef = useFocusTrap(isOpen);

  // Load user's NFT avatar when modal opens
  useEffect(() => {
    const loadUserAvatar = async () => {
      if (isOpen && isAuthenticated && token) {
        logger.log('CreatePostModal: Loading user avatar...', { isOpen, isAuthenticated, hasToken: !!token });
        try {
          const { usersAPI, nftsAPI } = await import('@/lib/api');
          const { user } = await usersAPI.getProfile(token);
          logger.log('CreatePostModal: User profile loaded', { nftAvatar: user.nftAvatar });

          if (user.nftAvatar) {
            logger.log('CreatePostModal: Found nftAvatar:', user.nftAvatar);
            // Check if it's a URL (old data) or mint address (new data)
            const isUrl = user.nftAvatar.startsWith('http://') || user.nftAvatar.startsWith('https://');

            if (isUrl) {
              // Old data format: nftAvatar is already a URL
              logger.log('CreatePostModal: Using URL directly:', user.nftAvatar);
              setUserAvatar(user.nftAvatar);
            } else {
              // New data format: nftAvatar is a mint address, fetch the NFT
              logger.log('CreatePostModal: Fetching NFT by mint:', user.nftAvatar);
              const nft = await nftsAPI.getNFTByMint(user.nftAvatar);
              logger.log('CreatePostModal: NFT fetched', { hasImage: !!nft?.image, nft });
              if (nft?.image) {
                setUserAvatar(nft.image);
                logger.log('CreatePostModal: Avatar set to:', nft.image);
              }
            }
          } else {
            logger.log('CreatePostModal: No NFT avatar in user profile');
          }
        } catch (error) {
          logger.error('CreatePostModal: Failed to load user avatar:', error);
        }
      } else {
        logger.log('CreatePostModal: Skipping avatar load', { isOpen, isAuthenticated, hasToken: !!token });
      }
    };

    loadUserAvatar();
  }, [isOpen, isAuthenticated, token]);

  // Update content when initialContent changes
  useEffect(() => {
    if (isOpen && initialContent) {
      setContent(initialContent);
    }
  }, [isOpen, initialContent]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isPosting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isPosting, onClose]);

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
            // Compress image before uploading
            const compressedImage = await compressImage(imageFile);
            const uploadResponse = await uploadAPI.uploadImage(compressedImage, token);
            imageUrl = uploadResponse.url;
          } catch (uploadError) {
            logger.error('Failed to upload image:', uploadError);
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

      // Debug: Log what backend returned
      console.log('🔍 Backend returned post:', {
        authorWallet: post.authorWallet,
        'author.tier': post.author?.tier,
        'author.snsUsername': post.author?.snsUsername,
        'author.nftAvatar': post.author?.nftAvatar,
        'author.username': post.author?.username,
        'author.walletAddress': post.author?.walletAddress
      });

      // Transform the backend response to match the frontend Post type
      // Use the complete author object from the backend (includes tier, SNS, NFT avatar)
      // Priority: SNS username > regular username > truncated wallet address
      const transformedPost = {
        ...post,
        // Use SNS username if available, otherwise username, otherwise truncated wallet
        user: post.author?.snsUsername || post.author?.username || post.authorWallet?.slice(0, 15) || publicKey?.toBase58()?.slice(0, 15) || 'Unknown',
        wallet: post.authorWallet,
        userTheme: post.author?.themeColor,
        time: 'Just now',
        likes: post.likeCount || 0,
        comments: post.replyCount || 0,
        reposts: 0,
        tips: post.tipCount || 0,
        image: post.imageUrl,
        avatar: post.author?.nftAvatar || null,
        // Preserve the complete author object from backend
        author: post.author,
      };

      console.log('✅ Transformed post for frontend:', {
        user: transformedPost.user,
        wallet: transformedPost.wallet,
        avatar: transformedPost.avatar,
        'author.tier': transformedPost.author?.tier,
        'author.snsUsername': transformedPost.author?.snsUsername,
        'author.nftAvatar': transformedPost.author?.nftAvatar,
        hasPremiumBadge: transformedPost.author?.tier === 'premium',
        hasNFTAvatar: !!transformedPost.avatar
      });

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
      logger.error('Failed to create post:', error);
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
    <div
      className="modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isPosting) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-post-title"
    >
      <div ref={modalRef} className="modal-content bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl shadow-2xl max-w-2xl w-full">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
          <h2 id="create-post-title" className="heading-2 text-[#fafafa] font-semibold">Create Post</h2>
          <button
            onClick={onClose}
            aria-label="Close create post modal"
            className="w-9 h-9 rounded-full hover:bg-white/[0.08] text-neutral-400 hover:text-[#fafafa] transition-colors duration-150 flex items-center justify-center"
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
            {userAvatar ? (
              <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden shadow-lg shadow-korus-primary/20">
                <Image
                  src={userAvatar}
                  alt="Your avatar"
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center flex-shrink-0 shadow-lg shadow-korus-primary/20">
                <span className="text-black font-bold">
                  {publicKey?.toBase58().slice(0, 2).toUpperCase() || 'U'}
                </span>
              </div>
            )}

            <div className="flex-1">
              {/* Text Area */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind? Share your experience, ask for advice, or offer support..."
                className={`w-full bg-transparent text-[#fafafa] text-base resize-none placeholder-neutral-600 max-h-[300px] ${showDrawCanvas ? 'min-h-[80px]' : 'min-h-[150px]'}`}
                style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                rows={showDrawCanvas ? 3 : 6}
                autoFocus
                aria-label="Post content"
                aria-describedby="character-counter"
              />

              {/* Inline Drawing Canvas */}
              {showDrawCanvas && (
                <div className="mt-3 p-3 bg-white/[0.04] border border-[#2a2a2a] rounded-xl">
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
                          className="max-w-full h-auto rounded-xl border border-[#2a2a2a]"
                        />
                      ) : (
                        <div className="w-full h-32 bg-white/[0.06] border border-[#2a2a2a] rounded-xl flex items-center justify-center">
                          <div className="text-center">
                            <svg className="w-8 h-8 mx-auto mb-2 text-[#a1a1a1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-xs text-[#a1a1a1] truncate">{file.name}</p>
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
                  <label
                    aria-label="Upload images or videos"
                    className="flex items-center justify-center w-10 h-10 bg-white/[0.06] backdrop-blur-sm border border-[#2a2a2a] rounded-xl text-korus-primary hover:bg-white/[0.12] hover:border-[#2a2a2a] transition-all duration-150 hover:shadow-lg hover:shadow-korus-primary/10 cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileSelect}
                      aria-label="Upload media files"
                    />
                  </label>

                  {/* GIF Button */}
                  <button
                    aria-label="Add GIF"
                    className="flex items-center justify-center w-10 h-10 bg-white/[0.06] backdrop-blur-sm border border-[#2a2a2a] rounded-xl text-korus-primary hover:bg-white/[0.12] hover:border-[#2a2a2a] transition-all duration-150 hover:shadow-lg hover:shadow-korus-primary/10"
                  >
                    <span className="text-xs font-bold">GIF</span>
                  </button>

                  {/* Emoji Button */}
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    aria-label="Add emoji"
                    className={`flex items-center justify-center w-10 h-10 backdrop-blur-sm border rounded-xl transition-all duration-150 hover:shadow-lg hover:shadow-korus-primary/10 ${
                      showEmojiPicker
                        ? 'bg-korus-primary/20 border-korus-primary text-korus-primary'
                        : 'bg-white/[0.06] border-[#2a2a2a] text-korus-primary hover:bg-white/[0.12] hover:border-[#2a2a2a]'
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
                    className={`flex items-center justify-center w-10 h-10 backdrop-blur-sm border rounded-xl transition-all duration-150 hover:shadow-lg hover:shadow-korus-primary/10 ${
                      showDrawCanvas
                        ? 'bg-korus-primary/20 border-korus-primary text-korus-primary'
                        : 'bg-white/[0.06] border-[#2a2a2a] text-korus-primary hover:bg-white/[0.12] hover:border-[#2a2a2a]'
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
                    aria-label="Create shoutout post"
                    className={`flex items-center gap-2 px-3 py-2 backdrop-blur-sm border rounded-xl transition-all duration-150 ${
                      content.trim() || selectedFiles.length > 0
                        ? 'bg-white/[0.06] border-[#2a2a2a] text-korus-primary hover:bg-white/[0.12] hover:border-[#2a2a2a] hover:shadow-lg hover:shadow-korus-primary/10 cursor-pointer'
                        : 'bg-white/[0.04] border-white/8 text-[#737373] cursor-not-allowed opacity-50'
                    }`}
                  >
                    <span className="text-sm font-medium">📢 Shoutout</span>
                  </button>

                  {/* Character Counter */}
                  <div className="flex items-center gap-2" id="character-counter" aria-live="polite">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                      isOverLimit
                        ? 'border-red-500 text-red-500'
                        : characterCount > MAX_POST_LENGTH * 0.8
                        ? 'border-yellow-500 text-yellow-500'
                        : 'border-[#2a2a2a] text-[#a1a1a1]'
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
                        className="text-white/10"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
              <h3 className="text-lg font-semibold text-[#fafafa]">Choose Emoji</h3>
              <button
                onClick={() => setShowEmojiPicker(false)}
                aria-label="Close emoji picker"
                className="w-9 h-9 rounded-full hover:bg-white/[0.08] text-neutral-400 hover:text-[#fafafa] transition-colors duration-150 flex items-center justify-center"
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
                    className="w-10 h-10 text-xl hover:bg-white/[0.12] rounded-lg transition-colors flex items-center justify-center hover:scale-110 transform"
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
                  // Compress image before uploading
                  const compressedImage = await compressImage(selectedFiles[0]);
                  const uploadResponse = await uploadAPI.uploadImage(compressedImage, token!);
                  imageUrl = uploadResponse.url;
                } catch (uploadError) {
                  logger.error('Image upload failed:', uploadError);
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
                image: post.imageUrl || imageUrl, // Include image from backend or uploaded URL
                imageUrl: post.imageUrl || imageUrl, // Ensure imageUrl is included
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
              logger.error('Failed to create shoutout post:', error);
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