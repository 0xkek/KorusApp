/**
 * Feed Modals Hook
 * Centralized state management for all feed-related modals
 */

import { useState, useCallback } from 'react';
import type { Post } from '@/types';

export function useFeedModals() {
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showShoutoutModal, setShowShoutoutModal] = useState(false);
  const [showPostOptionsModal, setShowPostOptionsModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const openTipModal = useCallback((post: Post) => {
    setSelectedPost(post);
    setShowTipModal(true);
  }, []);

  const openReplyModal = useCallback((post: Post) => {
    setSelectedPost(post);
    setShowReplyModal(true);
  }, []);

  const openRepostModal = useCallback((post: Post) => {
    setSelectedPost(post);
    setShowRepostModal(true);
  }, []);

  const openShareModal = useCallback((post: Post) => {
    setSelectedPost(post);
    setShowShareModal(true);
  }, []);

  const openPostOptionsModal = useCallback((post: Post) => {
    setSelectedPost(post);
    setShowPostOptionsModal(true);
  }, []);

  const closeAllModals = useCallback(() => {
    setShowCreatePostModal(false);
    setShowTipModal(false);
    setShowReplyModal(false);
    setShowRepostModal(false);
    setShowShareModal(false);
    setShowShoutoutModal(false);
    setShowPostOptionsModal(false);
    setShowSearchModal(false);
    setSelectedPost(null);
  }, []);

  return {
    // State
    showCreatePostModal,
    showTipModal,
    showReplyModal,
    showRepostModal,
    showShareModal,
    showShoutoutModal,
    showPostOptionsModal,
    showSearchModal,
    selectedPost,

    // Setters
    setShowCreatePostModal,
    setShowTipModal,
    setShowReplyModal,
    setShowRepostModal,
    setShowShareModal,
    setShowShoutoutModal,
    setShowPostOptionsModal,
    setShowSearchModal,
    setSelectedPost,

    // Actions
    openTipModal,
    openReplyModal,
    openRepostModal,
    openShareModal,
    openPostOptionsModal,
    closeAllModals,
  };
}
