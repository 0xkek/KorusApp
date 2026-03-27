'use client';

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import Image from 'next/image';
import { searchAPI } from '@/lib/api';

interface MentionUser {
  walletAddress: string;
  username?: string;
  snsUsername?: string;
  nftAvatar?: string;
  tier?: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  maxLength?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  autoFocus?: boolean;
}

export interface MentionTextareaRef {
  focus: () => void;
  textarea: HTMLTextAreaElement | null;
}

const MentionTextarea = forwardRef<MentionTextareaRef, MentionTextareaProps>(({
  value,
  onChange,
  placeholder,
  className,
  rows = 1,
  onKeyDown,
  autoFocus,
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    textarea: textareaRef.current,
  }));

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const res = await searchAPI.searchMentions(query, 8);
      const users = (res.users || []) as MentionUser[];
      setSuggestions(users);
      setShowSuggestions(users.length > 0);
      setSelectedIndex(0);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  const detectMention = useCallback((text: string, cursorPos: number) => {
    // Look backwards from cursor for an @ symbol
    const beforeCursor = text.slice(0, cursorPos);
    const mentionMatch = beforeCursor.match(/@([a-zA-Z0-9_]{0,20})$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      setMentionStart(cursorPos - query.length - 1); // -1 for @

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchSuggestions(query), 200);
    } else {
      setShowSuggestions(false);
      setMentionQuery('');
      setMentionStart(-1);
    }
  }, [fetchSuggestions]);

  const insertMention = useCallback((user: MentionUser) => {
    const displayName = user.username || user.snsUsername || user.walletAddress.slice(0, 8);
    const before = value.slice(0, mentionStart);
    const after = value.slice(mentionStart + mentionQuery.length + 1); // +1 for @
    const newValue = `${before}@${displayName} ${after}`;
    onChange(newValue);
    setShowSuggestions(false);
    setMentionQuery('');
    setMentionStart(-1);

    // Move cursor to after the inserted mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = mentionStart + displayName.length + 2; // @name + space
        textareaRef.current.selectionStart = newPos;
        textareaRef.current.selectionEnd = newPos;
        textareaRef.current.focus();
      }
    }, 0);
  }, [value, onChange, mentionStart, mentionQuery]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    detectMention(newValue, e.target.selectionStart || 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(suggestions[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }
    onKeyDown?.(e);
  };

  const handleClick = () => {
    if (textareaRef.current) {
      detectMention(value, textareaRef.current.selectionStart || 0);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        placeholder={placeholder}
        className={className}
        rows={rows}
        autoFocus={autoFocus}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 mt-1 bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-xl shadow-lg z-50 max-h-[240px] overflow-y-auto"
        >
          {suggestions.map((user, index) => {
            const displayName = user.username || user.snsUsername || user.walletAddress.slice(0, 12);
            const isPremium = user.tier === 'premium' || user.tier === 'vip';
            return (
              <button
                key={user.walletAddress}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  index === selectedIndex ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent textarea blur
                  insertMention(user);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex-shrink-0 overflow-hidden">
                  {user.nftAvatar ? (
                    <Image src={user.nftAvatar} alt="" width={32} height={32} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-black font-bold text-xs">{displayName.slice(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-[var(--color-text)] truncate">{displayName}</span>
                    {isPremium && (
                      <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                        <svg className="w-2 h-2" fill="black" viewBox="0 0 24 24">
                          <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-[var(--color-text-tertiary)] truncate block">
                    {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

MentionTextarea.displayName = 'MentionTextarea';
export default MentionTextarea;
