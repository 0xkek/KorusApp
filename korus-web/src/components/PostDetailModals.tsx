'use client';

import dynamic from 'next/dynamic';
import type { Post, Reply } from '@/types';
import ReplyModal from '@/components/ReplyModal';
import PostOptionsModal from '@/components/PostOptionsModal';
import EmojiPicker from '@/components/EmojiPicker';

const SearchModal = dynamic(() => import('@/components/SearchModal'), { ssr: false });
const MobileMenuModal = dynamic(() => import('@/components/MobileMenuModal'), { ssr: false });
const TipModal = dynamic(() => import('@/components/TipModal'), { ssr: false });
const ShareModal = dynamic(() => import('@/components/ShareModal'), { ssr: false });
const GifPicker = dynamic(() => import('@/components/GifPicker'), { ssr: false });

interface PostDetailModalsProps {
  // ReplyModal
  showReplyModal: boolean;
  onCloseReply: () => void;
  replyToPost: Post | null;
  onReplySuccess: () => void;

  // PostOptionsModal (for post)
  showPostOptionsModal: boolean;
  onClosePostOptions: () => void;
  selectedPost: Post | null;
  isOwnPost: boolean;

  // PostOptionsModal (for reply report)
  showReplyOptionsModal: boolean;
  onCloseReplyOptions: () => void;
  selectedReplyForReport: Reply | null;
  isOwnReply: boolean;

  // SearchModal
  showSearchModal: boolean;
  onCloseSearch: () => void;

  // MobileMenuModal
  showMobileMenu: boolean;
  onCloseMobileMenu: () => void;

  // TipModal
  showTipModal: boolean;
  onCloseTip: () => void;
  postToTip: Post | null;
  onTipSuccess: () => void;

  // ShareModal
  showShareModal: boolean;
  onCloseShare: () => void;
  postToShare: Post | null;

  // EmojiPicker
  showEmojiPicker: boolean;
  onEmojiSelect: (emoji: string) => void;
  onCloseEmojiPicker: () => void;

  // GifPicker
  showGifPicker: boolean;
  onGifSelect: (gifUrl: string) => void;
  onCloseGifPicker: () => void;
}

export default function PostDetailModals({
  showReplyModal,
  onCloseReply,
  replyToPost,
  onReplySuccess,
  showPostOptionsModal,
  onClosePostOptions,
  selectedPost,
  isOwnPost,
  showReplyOptionsModal,
  onCloseReplyOptions,
  selectedReplyForReport,
  isOwnReply,
  showSearchModal,
  onCloseSearch,
  showMobileMenu,
  onCloseMobileMenu,
  showTipModal,
  onCloseTip,
  postToTip,
  onTipSuccess,
  showShareModal,
  onCloseShare,
  postToShare,
  showEmojiPicker,
  onEmojiSelect,
  onCloseEmojiPicker,
  showGifPicker,
  onGifSelect,
  onCloseGifPicker,
}: PostDetailModalsProps) {
  return (
    <>
      {/* Reply Modal */}
      <ReplyModal
        isOpen={showReplyModal}
        onClose={onCloseReply}
        post={replyToPost}
        onReplySuccess={onReplySuccess}
      />

      {/* Post Options Modal */}
      <PostOptionsModal
        isOpen={showPostOptionsModal}
        onClose={onClosePostOptions}
        postId={selectedPost?.id || 0}
        postUser={selectedPost?.user || ''}
        isOwnPost={isOwnPost}
      />

      {/* Reply Options Modal */}
      <PostOptionsModal
        isOpen={showReplyOptionsModal}
        onClose={onCloseReplyOptions}
        postId={selectedReplyForReport?.id || 0}
        postUser={selectedReplyForReport?.user || ''}
        isOwnPost={isOwnReply}
        targetType="reply"
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={onCloseSearch}
        allPosts={[]}
      />

      {/* Mobile Menu Modal */}
      <MobileMenuModal
        isOpen={showMobileMenu}
        onClose={onCloseMobileMenu}
      />

      {/* Tip Modal */}
      <TipModal
        isOpen={showTipModal}
        onClose={onCloseTip}
        recipientUser={postToTip?.user || ''}
        postId={postToTip?.id}
        onTipSuccess={onTipSuccess}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={onCloseShare}
        postId={postToShare?.id || 0}
        postContent={postToShare?.content || ''}
        postUser={postToShare?.user || ''}
      />

      {/* Emoji Picker Modal */}
      {showEmojiPicker && (
        <EmojiPicker
          onSelect={onEmojiSelect}
          onClose={onCloseEmojiPicker}
        />
      )}

      {/* GIF Picker Modal */}
      {showGifPicker && (
        <GifPicker
          onSelect={onGifSelect}
          onClose={onCloseGifPicker}
        />
      )}
    </>
  );
}
