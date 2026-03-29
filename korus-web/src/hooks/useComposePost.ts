'use client';

import { useState, useRef } from 'react';
import { logger } from '@/utils/logger';
import { postsAPI, uploadAPI } from '@/lib/api';
import type { Post } from '@/types';

interface UseComposePostParams {
  token: string | null;
  isAuthenticated: boolean;
  connected: boolean;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}

export function useComposePost({
  token,
  isAuthenticated,
  connected,
  setPosts,
  showSuccess,
  showError,
}: UseComposePostParams) {
  const [composeText, setComposeText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [showDrawCanvas, setShowDrawCanvas] = useState(false);
  const [drawingDataUrl, setDrawingDataUrl] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const drawingSaveRef = useRef<(() => string | null) | null>(null);

  const resetCompose = () => {
    setComposeText('');
    setSelectedFiles([]);
    setSelectedGif(null);
    setDrawingDataUrl(null);
    setShowDrawCanvas(false);
  };

  const handleRegularPost = async () => {
    if (isPosting) return;
    if (!connected || !isAuthenticated || !token) {
      showError('Please connect your wallet and sign in to post');
      return;
    }

    // Get drawing data URL: from saved state, or from canvas if still open
    let drawingUrl = drawingDataUrl;
    if (!drawingUrl && showDrawCanvas) {
      if (drawingSaveRef.current) drawingUrl = drawingSaveRef.current();
      if (!drawingUrl) {
        const canvasEl = document.querySelector('canvas') as HTMLCanvasElement | null;
        if (canvasEl) drawingUrl = canvasEl.toDataURL('image/png');
      }
    }

    // Collect regular file uploads (non-drawing images from file picker)
    const filesToUpload = [...selectedFiles];

    if (!composeText.trim() && filesToUpload.length === 0 && !selectedGif && !drawingUrl) return;

    setIsPosting(true);

    try {

      // Upload regular files (from file picker) via the upload API
      let imageUrl: string | undefined;
      if (filesToUpload.length > 0) {
        const imageFile = filesToUpload[0];
        if (imageFile.type.startsWith('image/')) {
          try {
            const uploadResponse = await uploadAPI.uploadImage(imageFile, token);
            imageUrl = uploadResponse.url;
          } catch (uploadError: unknown) {
            const msg = uploadError instanceof Error ? uploadError.message : 'Unknown error';
            showError('Upload failed: ' + msg);
            setIsPosting(false);
            return;
          }
        }
      }

      // Prepare post data
      const postData: { topic: string; content?: string; subtopic: string; imageUrl?: string } = {
        topic: 'General',
        subtopic: 'discussion',
      };

      if (composeText.trim()) {
        postData.content = composeText.trim();
      }

      // Priority: GIF > uploaded file > drawing data URL (sent directly, backend uploads to Cloudinary)
      if (selectedGif) {
        postData.imageUrl = selectedGif;
      } else if (imageUrl) {
        postData.imageUrl = imageUrl;
      } else if (drawingUrl) {
        postData.imageUrl = drawingUrl;
      }

      if (!postData.content && !postData.imageUrl) {
        showError('Nothing to post.');
        setIsPosting(false);
        return;
      }

      // Create post via backend API
      const newPost = await postsAPI.createPost(postData, token);

      logger.log('Post created successfully:', newPost);

      // Extract the post from the response (backend returns {success: true, post: {...}})
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const post: any = (newPost as { post?: unknown }).post || newPost;

      // Add post to feed immediately as fallback (WebSocket may not be connected)
      // The WebSocket dedup logic (addedPostIds) will prevent duplicates if the event also arrives
      setPosts(prev => {
        const shoutouts = prev.filter(p => p.isShoutout);
        const regularPosts = prev.filter(p => !p.isShoutout);
        return [...shoutouts, post, ...regularPosts];
      });
      logger.log('✅ Post created and added to feed. Post ID:', post.id);

      resetCompose();
      showSuccess('Post created successfully!');
    } catch (error) {
      logger.error('Failed to create post:', error);
      showError('Failed to create post. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    logger.log('Files selected:', files.length, files);
    const maxFileSize = 10 * 1024 * 1024; // 10MB

    const validFiles = files.filter(file => {
      if (file.size > maxFileSize) {
        showError(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    logger.log('Valid files:', validFiles.length, validFiles);
    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 4));
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleEmojiSelect = (emoji: string) => {
    setComposeText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleDrawingSave = (dataUrl: string) => {
    setDrawingDataUrl(dataUrl);
    setShowDrawCanvas(false);
    showSuccess('Drawing added to your post!');
  };

  return {
    composeText,
    setComposeText,
    selectedFiles,
    setSelectedFiles,
    selectedGif,
    setSelectedGif,
    showDrawCanvas,
    setShowDrawCanvas,
    drawingDataUrl,
    setDrawingDataUrl,
    isPosting,
    showEmojiPicker,
    setShowEmojiPicker,
    showGifPicker,
    setShowGifPicker,
    drawingSaveRef,
    resetCompose,
    handleRegularPost,
    handleFileSelect,
    removeFile,
    handleEmojiSelect,
    handleDrawingSave,
  };
}
