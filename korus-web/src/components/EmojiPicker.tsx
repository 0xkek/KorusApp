'use client';

import { useEffect, useRef } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-[var(--color-overlay-background)] backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div ref={containerRef} onClick={(e) => e.stopPropagation()}>
        <Picker
          data={data}
          onEmojiSelect={(emoji: { native: string }) => onSelect(emoji.native)}
          theme="dark"
          set="native"
          previewPosition="none"
          skinTonePosition="search"
          maxFrequentRows={2}
        />
      </div>
    </div>
  );
}
