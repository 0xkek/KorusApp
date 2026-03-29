'use client';

import dynamic from 'next/dynamic';
import type { Post } from '@/types';

const TipModal = dynamic(() => import('@/components/TipModal'), { ssr: false });
const ShareModal = dynamic(() => import('@/components/ShareModal'), { ssr: false });
const PostOptionsModal = dynamic(() => import('@/components/PostOptionsModal'), { ssr: false });
const SearchModal = dynamic(() => import('@/components/SearchModal'), { ssr: false });
const CreatePostModal = dynamic(() => import('@/components/CreatePostModal'), { ssr: false });

interface ProfileModalsProps {
  // TipModal
  showTipModal: boolean;
  onCloseTip: () => void;
  tipRecipient: string;

  // ShareModal
  showShareModal: boolean;
  onCloseShare: () => void;
  postToShare: Post | null;

  // PostOptionsModal
  showPostOptionsModal: boolean;
  onClosePostOptions: () => void;
  selectedPost: Post | null;
  isOwnPost: boolean;
  onDeletePost: () => void;

  // SearchModal
  showSearchModal: boolean;
  onCloseSearch: () => void;
  allPosts: Post[];

  // CreatePostModal
  showCreatePostModal: boolean;
  onCloseCreatePost: () => void;
  onPostCreate: () => void;
}

export default function ProfileModals({
  showTipModal,
  onCloseTip,
  tipRecipient,
  showShareModal,
  onCloseShare,
  postToShare,
  showPostOptionsModal,
  onClosePostOptions,
  selectedPost,
  isOwnPost,
  onDeletePost,
  showSearchModal,
  onCloseSearch,
  allPosts,
  showCreatePostModal,
  onCloseCreatePost,
  onPostCreate,
}: ProfileModalsProps) {
  return (
    <>
      <TipModal
        isOpen={showTipModal}
        onClose={onCloseTip}
        recipientUser={tipRecipient}
      />

      {postToShare && (
        <ShareModal
          isOpen={showShareModal}
          onClose={onCloseShare}
          postId={postToShare.id}
          postContent={postToShare.content || ''}
          postUser={postToShare.user || ''}
        />
      )}

      {showPostOptionsModal && selectedPost && (
        <PostOptionsModal
          isOpen={showPostOptionsModal}
          onClose={onClosePostOptions}
          postId={selectedPost.id}
          postUser={selectedPost.user || ''}
          isOwnPost={isOwnPost}
          onDelete={onDeletePost}
        />
      )}

      <SearchModal
        isOpen={showSearchModal}
        onClose={onCloseSearch}
        allPosts={allPosts}
      />

      <CreatePostModal
        isOpen={showCreatePostModal}
        onClose={onCloseCreatePost}
        onPostCreate={onPostCreate}
      />
    </>
  );
}
