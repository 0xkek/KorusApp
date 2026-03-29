'use client';

import { logger } from '@/utils/logger';
import Image from 'next/image';

interface PostDetailInlineComposerProps {
  currentUserAvatar: string | null;
  walletPrefix: string | undefined;
  replyContent: string;
  onReplyContentChange: (content: string) => void;
  selectedFiles: File[];
  selectedGif: string | null;
  isPostingReply: boolean;
  connected: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onClearGif: () => void;
  onToggleGifPicker: () => void;
  onToggleEmojiPicker: () => void;
  showGifPicker: boolean;
  showEmojiPicker: boolean;
  onSubmitReply: () => void;
}

export default function PostDetailInlineComposer({
  currentUserAvatar,
  walletPrefix,
  replyContent,
  onReplyContentChange,
  selectedFiles,
  selectedGif,
  isPostingReply,
  connected,
  onFileSelect,
  onRemoveFile,
  onClearGif,
  onToggleGifPicker,
  onToggleEmojiPicker,
  showGifPicker,
  showEmojiPicker,
  onSubmitReply,
}: PostDetailInlineComposerProps) {
  return (
    <div className="px-4 py-3 border-b border-[var(--color-border-light)]">
      <div className="flex gap-3">
        {/* Avatar */}
        {currentUserAvatar ? (
          <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentUserAvatar}
              alt="Your avatar"
              className="w-full h-full object-cover"
              onError={(e) => {
                logger.error('Failed to load avatar image:', currentUserAvatar);
                e.currentTarget.style.display = 'none';
              }}
              onLoad={() => {
                logger.log('Avatar image loaded successfully:', currentUserAvatar);
              }}
            />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center flex-shrink-0">
            <span className="text-black font-bold text-sm">
              {walletPrefix || 'U'}
            </span>
          </div>
        )}

        {/* Reply Input Area */}
        <div className="flex-1 min-w-0">
          <textarea
            value={replyContent}
            onChange={(e) => onReplyContentChange(e.target.value)}
            placeholder="Post your reply"
            className="bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg text-[var(--color-text)] text-[15px] placeholder-[#737373] resize-none min-h-[28px] max-h-[300px] outline-none w-full px-3 py-2 focus:border-white/25 transition-colors duration-150"
            rows={1}
          />

          {/* File Previews */}
          {selectedFiles.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative group">
                  {file.type.startsWith('image/') ? (
                    <Image
                      src={URL.createObjectURL(file)}
                      alt="Upload preview"
                      width={200}
                      height={128}
                      className="max-w-full h-auto rounded-xl border border-[var(--color-border-light)]"
                    />
                  ) : (
                    <div className="w-full h-32 bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-8 h-8 mx-auto mb-2 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-xs text-[var(--color-text-tertiary)] truncate px-2">{file.name}</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => onRemoveFile(index)}
                    aria-label="Remove file"
                    className="absolute top-2 right-2 w-6 h-6 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-[var(--color-text)] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* GIF Preview */}
          {selectedGif && (
            <div className="relative group mt-3 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedGif}
                alt="Selected GIF"
                className="max-w-[200px] h-auto rounded-xl border border-[var(--color-border-light)]"
              />
              <button
                onClick={onClearGif}
                aria-label="Remove GIF"
                className="absolute top-2 right-2 w-6 h-6 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-[var(--color-text)] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Tools row */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-border-light)]">
            <div className="flex items-center gap-1">
              {/* Media Upload */}
              <label className="w-9 h-9 rounded-lg flex items-center justify-center text-korus-primary/60 hover:text-korus-primary hover:bg-korus-primary/10 transition-all duration-150 cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,video/*"
                  multiple
                  onChange={onFileSelect}
                />
              </label>

              {/* GIF Button */}
              <button
                onClick={onToggleGifPicker}
                aria-label="Add GIF"
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 ${
                  showGifPicker
                    ? 'text-korus-primary bg-korus-primary/10'
                    : 'text-korus-primary/60 hover:text-korus-primary hover:bg-korus-primary/10'
                }`}
              >
                <span className="text-xs font-bold">GIF</span>
              </button>

              {/* Emoji Button */}
              <button
                onClick={onToggleEmojiPicker}
                aria-label="Add emoji"
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 ${
                  showEmojiPicker
                    ? 'text-korus-primary bg-korus-primary/10'
                    : 'text-korus-primary/60 hover:text-korus-primary hover:bg-korus-primary/10'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M16 10h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Character Counter - only show when typing */}
              {replyContent.length > 0 && (
                <div className={`text-xs font-medium ${
                  replyContent.length > 280
                    ? 'text-red-400'
                    : replyContent.length > 224
                    ? 'text-yellow-400'
                    : 'text-[var(--color-text-tertiary)]'
                }`}>
                  {replyContent.length > 280 && `-${replyContent.length - 280}`}
                  {replyContent.length <= 280 && `${280 - replyContent.length}`}
                </div>
              )}

              {/* Reply Button */}
              <button
                onClick={onSubmitReply}
                disabled={!replyContent.trim() || replyContent.length > 280 || isPostingReply || !connected}
                className={`px-5 py-2 rounded-[20px] text-sm font-semibold transition-all duration-150 ${
                  !replyContent.trim() || replyContent.length > 280 || isPostingReply || !connected
                    ? 'bg-korus-primary/20 text-korus-primary/40 cursor-not-allowed'
                    : 'bg-korus-primary text-black hover:opacity-90'
                }`}
              >
                {isPostingReply ? 'Posting...' : !connected ? 'Connect' : 'Reply'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
