'use client';

import dynamic from 'next/dynamic';
import type { Post } from '@/types';

const CreatePostModal = dynamic(() => import('@/components/CreatePostModal'), { ssr: false });
const PostOptionsModal = dynamic(() => import('@/components/PostOptionsModal'), { ssr: false });
const MobileMenuModal = dynamic(() => import('@/components/MobileMenuModal'), { ssr: false });
const ShoutoutModal = dynamic(() => import('@/components/ShoutoutModal'), { ssr: false });
const TipModal = dynamic(() => import('@/components/TipModal'), { ssr: false });
const ShareModal = dynamic(() => import('@/components/ShareModal'), { ssr: false });
const ReplyModal = dynamic(() => import('@/components/ReplyModal'), { ssr: false });
const SearchModal = dynamic(() => import('@/components/SearchModal'), { ssr: false });

interface FeedModalsProps {
  // CreatePostModal
  showCreatePostModal: boolean;
  onCloseCreatePost: () => void;
  onPostCreate: (post: Post) => void;
  effectiveQueueInfo: { activeShoutout: { id: string; duration: number; expiresAt: Date | string; content: string } | null; queuedShoutouts: Array<{ id: string; duration: number; expiresAt: Date | string; content: string }> };

  // PostOptionsModal
  showPostOptionsModal: boolean;
  onClosePostOptions: () => void;
  selectedPost: Post | null;
  isOwnPost: boolean;
  onDeletePost: () => void;

  // ShoutoutModal
  showShoutoutModal: boolean;
  onCloseShoutout: () => void;
  shoutoutPostContent: string;
  onShoutoutConfirm: (duration: number, price: number, transactionSignature: string) => Promise<void>;

  // TipModal
  showTipModal: boolean;
  onCloseTip: () => void;
  postToTip: Post | null;
  onTipSuccess: (amount: number) => void;

  // ShareModal
  showShareModal: boolean;
  onCloseShare: () => void;
  postToShare: Post | null;

  // ReplyModal
  showReplyModal: boolean;
  onCloseReply: () => void;
  postToReply: Post | null;
  onReplySuccess: (reply: unknown) => void;

  // SearchModal
  showSearchModal: boolean;
  onCloseSearch: () => void;
  allPosts: Post[];

  // MobileMenuModal
  showMobileMenu: boolean;
  onCloseMobileMenu: () => void;
}

export default function FeedModals({
  showCreatePostModal,
  onCloseCreatePost,
  onPostCreate,
  effectiveQueueInfo,
  showPostOptionsModal,
  onClosePostOptions,
  selectedPost,
  isOwnPost,
  onDeletePost,
  showShoutoutModal,
  onCloseShoutout,
  shoutoutPostContent,
  onShoutoutConfirm,
  showTipModal,
  onCloseTip,
  postToTip,
  onTipSuccess,
  showShareModal,
  onCloseShare,
  postToShare,
  showReplyModal,
  onCloseReply,
  postToReply,
  onReplySuccess,
  showSearchModal,
  onCloseSearch,
  allPosts,
  showMobileMenu,
  onCloseMobileMenu,
}: FeedModalsProps) {
  return (
    <>
      <CreatePostModal
        isOpen={showCreatePostModal}
        onClose={onCloseCreatePost}
        onPostCreate={onPostCreate}
        queueInfo={effectiveQueueInfo}
      />

      <PostOptionsModal
        isOpen={showPostOptionsModal}
        onClose={onClosePostOptions}
        postId={selectedPost?.id || 0}
        postUser={selectedPost?.user || ''}
        isOwnPost={isOwnPost}
        onDelete={onDeletePost}
      />

      <ShoutoutModal
        isOpen={showShoutoutModal}
        onClose={onCloseShoutout}
        postContent={shoutoutPostContent}
        onConfirm={onShoutoutConfirm}
        queueInfo={effectiveQueueInfo}
      />

      <TipModal
        isOpen={showTipModal}
        onClose={onCloseTip}
        recipientUser={postToTip?.wallet || postToTip?.user || ''}
        postId={postToTip?.id}
        onTipSuccess={onTipSuccess}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={onCloseShare}
        postId={postToShare?.id || 0}
        postContent={postToShare?.content || ''}
        postUser={postToShare?.user || ''}
      />

      <ReplyModal
        isOpen={showReplyModal}
        onClose={onCloseReply}
        post={postToReply}
        onReplySuccess={onReplySuccess}
      />

      <SearchModal
        isOpen={showSearchModal}
        onClose={onCloseSearch}
        allPosts={allPosts}
      />

      <MobileMenuModal
        isOpen={showMobileMenu}
        onClose={onCloseMobileMenu}
      />
    </>
  );
}
