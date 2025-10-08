/**
 * Shared constants across the application
 */

// Post & Content Limits
export const MAX_POST_LENGTH = 280;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
export const MAX_FILES_PER_POST = 4;

// Shoutout Options (duration in minutes, price in SOL)
export const SHOUTOUT_OPTIONS = [
  { label: '10 min', value: 10, price: 0.10, recommended: false },
  { label: '20 min', value: 20, price: 0.20, recommended: false },
  { label: '30 min', value: 30, price: 0.30, recommended: false },
  { label: '1 hour', value: 60, price: 0.60, recommended: false },
  { label: '2 hours', value: 120, price: 1.20, recommended: true },
  { label: '3 hours', value: 180, price: 1.80, recommended: false },
  { label: '4 hours', value: 240, price: 2.40, recommended: false },
  { label: '6 hours', value: 360, price: 3.60, recommended: false },
] as const;

// Tip Presets (in SOL)
export const TIP_PRESETS = [0.01, 0.05, 0.1, 0.25, 0.5, 1.0] as const;
export const MIN_TIP_AMOUNT = 0.001; // SOL

// Network
export const SOLANA_NETWORK_FEE = 0.0005; // Approximate SOL network fee

// Premium
export const PREMIUM_MONTHLY_PRICE = 0.1; // SOL
export const PREMIUM_YEARLY_PRICE = 1.0; // SOL
export const PREMIUM_REP_MULTIPLIER = 1.2; // 20% bonus

// Reputation Score Weights
export const REP_SCORE_WEIGHTS = {
  POST: 10,
  TIP_RECEIVED: 20,
  TIP_GIVEN: 15,
} as const;

// Theme Options
export const THEME_OPTIONS = [
  { id: 'mint', name: 'Mint Fresh', colors: ['#43e97b', '#38f9d7'], free: true },
  { id: 'purple', name: 'Royal Purple', colors: ['#9945FF', '#E935C1'], free: false },
  { id: 'blue', name: 'Blue Sky', colors: ['#00D4FF', '#5B8DEF'], free: false },
  { id: 'gold', name: 'Premium Gold', colors: ['#FFD700', '#FFA500'], free: false },
  { id: 'cherry', name: 'Cherry Blossom', colors: ['#FF6B9D', '#FF8E9E'], free: false },
  { id: 'cyber', name: 'Cyber Neon', colors: ['#00FFF0', '#FF10F0'], free: false },
] as const;

// Search
export const SEARCH_CATEGORIES = ['All', 'General', 'Games', 'Events'] as const;
export const SEARCH_HISTORY_MAX = 10;

// Timeouts & Delays
export const TOAST_DURATION = 3000; // ms
export const DEBOUNCE_DELAY = 500; // ms
export const ANIMATION_DURATION = 300; // ms

// URLs & Links
export const SOLANA_EXPLORER_BASE = 'https://explorer.solana.com';
export const DEFAULT_RPC_URL = 'https://api.devnet.solana.com';

// LocalStorage Keys
export const STORAGE_KEYS = {
  USERNAME: 'korus_username',
  PREMIUM_STATUS: 'korus-premium-status',
  HIDE_SHOUTOUT: 'korus-hide-shoutout',
  SEARCH_HISTORY: 'korus-search-history',
  THEME: 'theme',
} as const;

// Emoji Sets
export const POPULAR_EMOJIS = [
  '😀', '😂', '🤣', '😊', '😍', '🥰', '😘', '🤔', '😎', '😢', '😭', '😡', '🤯', '🥳', '😴', '🤤',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '👋', '🤚', '🖐️', '✋', '👏', '🙌', '🤝', '🙏', '✊',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
  '🎉', '🎊', '🎈', '🎁', '🎂', '🎄', '🎃', '✨', '🎯', '🎪', '🎨', '🎭', '🎬', '🎮', '🎵', '🎶',
  '🔥', '💯', '💫', '⭐', '🌟', '⚡', '💥', '💨', '🌈', '☀️', '🌙', '⭐', '🌊', '🌍', '🌎', '🌏',
  '💰', '💸', '💵', '💎', '🚀', '📈', '📉', '💹', '🏦', '💳', '⚖️', '🎯', '✅', '❌', '⚠️', '💯',
  '🍕', '🍔', '🍟', '🌭', '🍿', '🧂', '🥓', '🍳', '🧀', '🥞', '🧇', '🍞', '🥖', '🥨', '🥯', '🥐',
  '☕', '🍵', '🧃', '🥤', '🍻', '🍷', '🥂', '🍾', '🍸', '🍹', '🍺', '🥃', '🥛', '🧋', '🧊', '🍯',
] as const;
