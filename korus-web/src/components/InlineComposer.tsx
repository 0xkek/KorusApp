'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';

const MentionTextarea = dynamic(() => import('@/components/MentionTextarea'), { ssr: false });
const DrawingCanvasInline = dynamic(() => import('@/components/DrawingCanvasInline'), { ssr: false });
const GifPicker = dynamic(() => import('@/components/GifPicker'), { ssr: false });
const EmojiPicker = dynamic(() => import('@/components/EmojiPicker'), { ssr: false });

interface InlineComposerProps {
  userAvatar: string | null;
  walletPrefix: string | undefined;
  composeText: string;
  onComposeTextChange: (text: string) => void;
  selectedFiles: File[];
  showDrawCanvas: boolean;
  drawingDataUrl: string | null;
  showEmojiPicker: boolean;
  showGifPicker: boolean;
  isPosting: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onEmojiSelect: (emoji: string) => void;
  onGifSelect: (gifUrl: string) => void;
  onDrawingSave: (dataUrl: string) => void;
  onClearDrawing: () => void;
  onToggleDrawCanvas: () => void;
  onToggleEmojiPicker: () => void;
  onToggleGifPicker: () => void;
  onShoutoutClick: () => void;
  onPost: () => void;
  drawingSaveRef: React.MutableRefObject<(() => string | null) | null>;
  onCloseDrawCanvas: () => void;
}

export default function InlineComposer({
  userAvatar,
  walletPrefix,
  composeText,
  onComposeTextChange,
  selectedFiles,
  showDrawCanvas,
  drawingDataUrl,
  showEmojiPicker,
  showGifPicker,
  isPosting,
  onFileSelect,
  onRemoveFile,
  onEmojiSelect,
  onGifSelect,
  onDrawingSave,
  onClearDrawing,
  onToggleDrawCanvas,
  onToggleEmojiPicker,
  onToggleGifPicker,
  onShoutoutClick,
  onPost,
  drawingSaveRef,
  onCloseDrawCanvas,
}: InlineComposerProps) {
  return (
    <>
      <div className="px-5 py-4 border-b border-[var(--color-border-light)] flex gap-3">
        {userAvatar ? (
          <div className="w-[42px] h-[42px] rounded-full flex-shrink-0 overflow-hidden">
            <Image
              src={userAvatar}
              alt="Your avatar"
              width={42}
              height={42}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center flex-shrink-0">
            <span className="text-black font-bold text-sm">
              {walletPrefix}
            </span>
          </div>
        )}
        <div className="flex-1">
          <MentionTextarea
            value={composeText}
            onChange={onComposeTextChange}
            placeholder="What's happening on Solana?"
            className="bg-transparent text-[var(--color-text)] text-[16px] placeholder-[#525252] w-full resize-none min-h-[48px] border-none outline-none leading-relaxed"
            rows={1}
          />

          {/* Inline Drawing Canvas */}
          {showDrawCanvas && (
            <div className="mt-3 p-3 bg-white/[0.04] border border-[var(--color-border-light)] rounded-xl">
              <DrawingCanvasInline
                onSave={onDrawingSave}
                onClose={onCloseDrawCanvas}
                saveRef={drawingSaveRef}
              />
            </div>
          )}

          {/* Drawing Preview */}
          {drawingDataUrl && (
            <div className="relative group mt-4 inline-block">
              <img
                src={drawingDataUrl}
                alt="Drawing preview"
                className="max-w-[200px] h-auto rounded-xl border border-[var(--color-border-light)]"
              />
              <button
                onClick={onClearDrawing}
                className="absolute top-2 right-2 w-6 h-6 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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
                      className="max-w-full h-auto rounded-xl border border-[var(--color-border-light)]"
                    />
                  ) : (
                    <div className="w-full h-32 bg-white/[0.06] border border-[var(--color-border-light)] rounded-xl flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-8 h-8 mx-auto mb-2 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-xs text-[var(--color-text-secondary)] truncate px-2">{file.name}</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => onRemoveFile(index)}
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

          {/* Post Options */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-border-light)]">
            <div className="flex items-center gap-0.5">
              {/* Image Upload */}
              <label className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-[var(--korus-primary)] hover:bg-[color-mix(in_srgb,var(--korus-primary)_10%,transparent)] transition-all cursor-pointer">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center transition-all ${
                  showGifPicker
                    ? 'text-[var(--korus-primary)] bg-[color-mix(in_srgb,var(--korus-primary)_10%,transparent)]'
                    : 'text-[var(--korus-primary)] hover:bg-[color-mix(in_srgb,var(--korus-primary)_10%,transparent)]'
                }`}
              >
                <span className="text-xs font-bold">GIF</span>
              </button>
              {/* Emoji Button */}
              <button
                onClick={onToggleEmojiPicker}
                className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center transition-all ${
                  showEmojiPicker
                    ? 'text-[var(--korus-primary)] bg-[color-mix(in_srgb,var(--korus-primary)_10%,transparent)]'
                    : 'text-[var(--korus-primary)] hover:bg-[color-mix(in_srgb,var(--korus-primary)_10%,transparent)]'
                }`}
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M16 10h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              {/* Draw Button */}
              <button
                onClick={onToggleDrawCanvas}
                className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center transition-all ${
                  showDrawCanvas
                    ? 'text-[var(--korus-primary)] bg-[color-mix(in_srgb,var(--korus-primary)_10%,transparent)]'
                    : 'text-[var(--korus-primary)] hover:bg-[color-mix(in_srgb,var(--korus-primary)_10%,transparent)]'
                }`}
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onShoutoutClick}
                disabled={isPosting || (!composeText.trim() && selectedFiles.length === 0 && !drawingDataUrl)}
                className="px-4 py-2 rounded-[20px] border border-[var(--korus-primary)] text-[13px] font-bold hover:bg-[color-mix(in_srgb,var(--korus-primary)_10%,transparent)] transition-all disabled:opacity-40 disabled:cursor-not-allowed leading-none"
                style={{ color: 'var(--korus-primary)' }}
              >
                📢 Shoutout
              </button>
              <button
                onClick={onPost}
                disabled={isPosting || (!composeText.trim() && selectedFiles.length === 0 && !showDrawCanvas && !drawingDataUrl)}
                className="px-5 py-2 rounded-[20px] bg-[var(--korus-primary)] text-[14px] font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed leading-none"
                style={{ color: '#000' }}
              >
                {isPosting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Emoji Picker Modal */}
      {showEmojiPicker && (
        <EmojiPicker
          onSelect={onEmojiSelect}
          onClose={onToggleEmojiPicker}
        />
      )}

      {/* GIF Picker Modal */}
      {showGifPicker && (
        <GifPicker
          onSelect={onGifSelect}
          onClose={onToggleGifPicker}
        />
      )}
    </>
  );
}
