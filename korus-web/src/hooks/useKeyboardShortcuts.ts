/**
 * Custom hook for global keyboard shortcuts
 */

import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  callback: () => void;
  description?: string;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in an input/textarea
      const target = event.target as HTMLElement;
      const isTyping = ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable;

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey;
        const metaMatches = shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey;
        const shiftMatches = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey;

        // Special handling for ESC key - always works even when typing
        if (shortcut.key === 'Escape' && keyMatches) {
          event.preventDefault();
          shortcut.callback();
          return;
        }

        // Special handling for / key - focus search
        if (shortcut.key === '/' && keyMatches && !isTyping) {
          event.preventDefault();
          shortcut.callback();
          return;
        }

        // Other shortcuts only work when not typing
        if (!isTyping && keyMatches && ctrlMatches && metaMatches && shiftMatches) {
          event.preventDefault();
          shortcut.callback();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, enabled]);
}
