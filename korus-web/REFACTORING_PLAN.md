# Korus Web - Complete Refactoring Plan

**Status:** Draft
**Last Updated:** 2025-01-20
**Estimated Total Time:** 2-3 weeks

---

## Table of Contents
1. [Quick Wins (1-2 days)](#phase-1-quick-wins-1-2-days)
2. [Critical Fixes (3-5 days)](#phase-2-critical-fixes-3-5-days)
3. [Architectural Improvements (1 week)](#phase-3-architectural-improvements-1-week)
4. [Polish & Testing (3-5 days)](#phase-4-polish--testing-3-5-days)

---

## Phase 1: Quick Wins (1-2 days)

### 🎯 Goal: Fix build errors, remove console logs, add missing dependencies

### Task 1.1: Fix TypeScript/ESLint Errors (2 hours)

**Current State:** 69 build errors
**Target:** 0 build errors

**Steps:**

1. **Fix `any` types** (14+ instances)
```bash
# Find all instances
grep -rn "any" src/app/events --include="*.tsx"
```

Replace with proper types:
```typescript
// ❌ Before
const handleSubmit = (data: any) => { ... }

// ✅ After
interface SubmitData {
  title: string;
  description: string;
  // ... other fields
}
const handleSubmit = (data: SubmitData) => { ... }
```

2. **Fix unescaped apostrophes**
```typescript
// ❌ Before
<p>User's profile</p>

// ✅ After
<p>User&apos;s profile</p>
// OR
<p>{`User's profile`}</p>
```

3. **Fix exhaustive deps warnings**
```typescript
// ❌ Before
useEffect(() => {
  showError('Failed');
}, []); // Missing showError dependency

// ✅ After
useEffect(() => {
  showError('Failed');
}, [showError]);
```

4. **Remove unused variables**
```typescript
// ❌ Before
const [isAuthenticated, setIsAuthenticated] = useState(false); // Never used

// ✅ After
// Just delete it
```

**Verification:**
```bash
npm run build
# Should succeed with 0 errors
```

---

### Task 1.2: Add Explicit Dependencies (5 minutes)

**Add bs58 to package.json** (best practice):
```bash
cd /Users/maxattard/KorusApp/korus-web
npm install --save bs58
```

**Add image compression library:**
```bash
npm install --save browser-image-compression
```

**Add input sanitization:**
```bash
npm install --save dompurify
npm install --save-dev @types/dompurify
```

---

### Task 1.3: Remove Console Statements (1 hour)

**Current State:** 263 console statements
**Target:** 0 production console statements

**Steps:**

1. **Replace all console.log with logger utility**

Create a simple logger if you don't have one already:
```typescript
// src/utils/logger.ts (already exists, verify it's being used)
const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args: any[]) => isDev && console.log('[DEBUG]', ...args),
  info: (...args: any[]) => isDev && console.info('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
};
```

2. **Automated replacement**
```bash
# Find and replace console.log with logger.debug
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/console\.log/logger.debug/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/console\.error/logger.error/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/console\.warn/logger.warn/g'
```

3. **Add imports**
```bash
# Add import statement to files that use logger
# This requires manual check, but look for files without the import:
grep -l "logger\." src/**/*.ts src/**/*.tsx | xargs grep -L "import.*logger"
```

**Verification:**
```bash
# Should find 0 console statements
grep -r "console\." src --include="*.ts" --include="*.tsx" | wc -l
```

---

## Phase 2: Critical Fixes (3-5 days)

### 🎯 Goal: Fix authentication, add input sanitization, unify types

### Task 2.1: Refactor Authentication Hook (1 day)

**Current State:** Global mutable state anti-pattern
**Target:** Proper React state management with Zustand

**Steps:**

1. **Install Zustand**
```bash
npm install --save zustand
```

2. **Create auth store** (replaces the global state pattern)
```typescript
// src/stores/authStore.ts
import create from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '@/lib/api';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  error: string | null;
  lastAuthTime: number | null;
}

interface AuthActions {
  setToken: (token: string | null) => void;
  setError: (error: string | null) => void;
  authenticate: (publicKey: string, signMessage: (message: Uint8Array) => Promise<Uint8Array>) => Promise<void>;
  logout: () => void;
  reset: () => void;
}

const AUTH_COOLDOWN_MS = 5000;

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      token: null,
      isAuthenticated: false,
      isAuthenticating: false,
      error: null,
      lastAuthTime: null,

      // Actions
      setToken: (token) => set({
        token,
        isAuthenticated: !!token,
        error: null
      }),

      setError: (error) => set({ error, isAuthenticating: false }),

      authenticate: async (publicKey, signMessage) => {
        const state = get();

        // Check cooldown
        if (state.lastAuthTime && (Date.now() - state.lastAuthTime) < AUTH_COOLDOWN_MS) {
          console.log('⏸️ Recently authenticated, skipping');
          return;
        }

        // Prevent concurrent auth
        if (state.isAuthenticating) {
          console.log('Authentication already in progress');
          return;
        }

        set({ isAuthenticating: true, error: null });

        try {
          const message = `Sign this message to authenticate with Korus.\n\nWallet: ${publicKey}\nTimestamp: ${Date.now()}`;
          const messageBytes = new TextEncoder().encode(message);
          const signature = await signMessage(messageBytes);

          const bs58 = await import('bs58');
          const signatureBase58 = bs58.default.encode(signature);

          const response = await authAPI.authenticate({
            walletAddress: publicKey,
            signature: signatureBase58,
            message,
          });

          set({
            token: response.token,
            isAuthenticated: true,
            isAuthenticating: false,
            lastAuthTime: Date.now(),
            error: null,
          });

          // Store in localStorage as backup
          if (typeof window !== 'undefined') {
            localStorage.setItem('korus_auth_token', response.token);
          }
        } catch (error: any) {
          set({
            error: error.message || 'Authentication failed',
            isAuthenticating: false,
            isAuthenticated: false,
            token: null,
          });
        }
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('korus_auth_token');
        }
        set({
          token: null,
          isAuthenticated: false,
          error: null,
          lastAuthTime: null,
        });
      },

      reset: () => {
        set({
          token: null,
          isAuthenticated: false,
          isAuthenticating: false,
          error: null,
          lastAuthTime: null,
        });
      },
    }),
    {
      name: 'korus-auth-storage',
      partialize: (state) => ({ token: state.token }), // Only persist token
    }
  )
);
```

3. **Replace useWalletAuth hook**
```typescript
// src/hooks/useWalletAuth.ts
import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuthStore } from '@/stores/authStore';

export function useWalletAuth() {
  const { publicKey, signMessage, connected } = useWallet();
  const { token, isAuthenticated, isAuthenticating, error, authenticate, logout } = useAuthStore();

  // Auto-authenticate when wallet connects
  useEffect(() => {
    if (connected && publicKey && signMessage && !isAuthenticated && !isAuthenticating) {
      authenticate(publicKey.toBase58(), signMessage);
    }

    if (!connected && isAuthenticated) {
      logout();
    }
  }, [connected, publicKey, signMessage, isAuthenticated, isAuthenticating, authenticate, logout]);

  return {
    token,
    isAuthenticated,
    isAuthenticating,
    error,
    authenticate: async () => {
      if (publicKey && signMessage) {
        await authenticate(publicKey.toBase58(), signMessage);
      }
    },
    logout,
  };
}
```

4. **Remove WalletAuthContext**
```bash
# Delete the redundant context file
rm src/contexts/WalletAuthContext.tsx
```

5. **Update imports throughout the codebase**
```bash
# Find all files using WalletAuthContext
grep -r "WalletAuthContext" src --include="*.tsx" --include="*.ts"

# Replace with useWalletAuth hook import
# This needs manual update in each file
```

**Verification:**
```bash
# Test authentication flow
npm run dev
# Connect wallet, verify no duplicate auth attempts
# Check React DevTools - no global state warnings
```

---

### Task 2.2: Add Input Sanitization (2 hours)

**Current State:** No XSS protection
**Target:** All user content sanitized

**Steps:**

1. **Create sanitization utility**
```typescript
// src/utils/sanitize.ts
import DOMPurify from 'dompurify';

interface SanitizeOptions {
  allowLinks?: boolean;
  allowImages?: boolean;
  allowVideos?: boolean;
}

export function sanitizeContent(
  content: string,
  options: SanitizeOptions = {}
): string {
  const config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
      ...(options.allowLinks ? ['a'] : []),
      ...(options.allowImages ? ['img'] : []),
      ...(options.allowVideos ? ['video', 'source'] : []),
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel',
      ...(options.allowImages ? ['src', 'alt', 'width', 'height'] : []),
      ...(options.allowVideos ? ['src', 'controls', 'type'] : []),
    ],
    ALLOW_DATA_ATTR: false,
  };

  return DOMPurify.sanitize(content, config);
}

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Only allow http, https, and ipfs protocols
    if (!['http:', 'https:', 'ipfs:'].includes(parsed.protocol)) {
      return '';
    }
    return url;
  } catch {
    return '';
  }
}
```

2. **Create SafeContent component**
```typescript
// src/components/SafeContent.tsx
import { sanitizeContent } from '@/utils/sanitize';

interface SafeContentProps {
  content: string;
  allowLinks?: boolean;
  allowImages?: boolean;
  className?: string;
}

export function SafeContent({
  content,
  allowLinks = true,
  allowImages = false,
  className = ''
}: SafeContentProps) {
  const sanitized = sanitizeContent(content, { allowLinks, allowImages });

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
```

3. **Update PostCard component**
```typescript
// src/components/PostCard.tsx
import { SafeContent } from '@/components/SafeContent';

// ❌ Before
<p className="text-white">{post.content}</p>

// ✅ After
<SafeContent
  content={post.content}
  allowLinks={true}
  className="text-white"
/>
```

4. **Apply to all user content**
```bash
# Find all places rendering post content
grep -rn "post.content" src --include="*.tsx"

# Update each one to use SafeContent component
```

**Verification:**
```bash
# Test XSS attempt
# 1. Create post with: <img src=x onerror="alert('XSS')">
# 2. Verify alert doesn't fire
# 3. Verify content is sanitized in DOM inspector
```

---

### Task 2.3: Unify Type Definitions (3 hours)

**Current State:** Frontend and backend types don't match
**Target:** Single source of truth with type adapters

**Steps:**

1. **Create shared API types** (matches backend exactly)
```typescript
// src/types/api.ts
export interface APIPost {
  id: number;
  walletAddress: string;
  authorWallet: string;
  content: string;
  category: string;
  subcategory: string;
  imageUrl?: string;
  videoUrl?: string;
  createdAt: string;
  updatedAt: string;
  likeCount?: number;
  replyCount?: number;
  repostCount?: number;
  tipAmount?: string;
  isLiked?: boolean;
  isRepost?: boolean;
  isShoutout?: boolean;
  shoutoutDuration?: number;
  shoutoutStartTime?: string;
  author?: {
    walletAddress: string;
    username?: string;
    snsUsername?: string;
    displayName?: string;
    nftAvatar?: string;
    tier?: string;
    themeColor?: string;
  };
  originalPost?: APIPost;
}

export interface APIReply {
  id: string;
  postId: string;
  authorWallet: string;
  content: string;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  parentReplyId?: string;
  imageUrl?: string;
  videoUrl?: string;
  isHidden: boolean;
  author: {
    walletAddress: string;
    tier: string;
    genesisVerified: boolean;
    snsUsername?: string;
    username?: string;
    nftAvatar?: string;
  };
  childReplies?: APIReply[];
  _count?: {
    childReplies: number;
  };
}
```

2. **Keep frontend UI types simple**
```typescript
// src/types/post.ts
export interface Post {
  id: number;
  user: string;
  wallet: string;
  content: string;
  likes: number;
  replies: number;
  reposts: number;
  tips: number;
  time: string;
  isPremium: boolean;
  isShoutout?: boolean;
  isRepost?: boolean;
  image?: string;
  video?: string;
  avatar?: string | null;
  userTheme?: string;
  repostedPost?: Post;
  repostedBy?: string;
}

export interface Reply {
  id: string;
  user: string;
  wallet: string;
  content: string;
  likes: number;
  replies: Reply[];
  time: string;
  isPremium: boolean;
  image?: string;
  video?: string;
}
```

3. **Create type adapters**
```typescript
// src/lib/adapters/postAdapter.ts
import { APIPost, APIReply } from '@/types/api';
import { Post, Reply } from '@/types/post';

export function apiPostToPost(apiPost: APIPost): Post {
  return {
    id: apiPost.id,
    user: apiPost.author?.username ||
          apiPost.author?.snsUsername ||
          apiPost.authorWallet?.slice(0, 15) ||
          'Unknown',
    wallet: apiPost.authorWallet,
    content: apiPost.content,
    likes: apiPost.likeCount || 0,
    replies: apiPost.replyCount || 0,
    reposts: apiPost.repostCount || 0,
    tips: Number(apiPost.tipAmount) || 0,
    time: new Date(apiPost.createdAt).toLocaleString(),
    isPremium: apiPost.author?.tier === 'premium',
    isShoutout: apiPost.isShoutout,
    isRepost: apiPost.isRepost,
    image: apiPost.imageUrl,
    video: apiPost.videoUrl,
    avatar: apiPost.author?.nftAvatar || null,
    userTheme: apiPost.author?.themeColor,
    repostedPost: apiPost.originalPost ? apiPostToPost(apiPost.originalPost) : undefined,
  };
}

export function apiReplyToReply(apiReply: APIReply): Reply {
  return {
    id: apiReply.id,
    user: apiReply.author.username ||
          apiReply.author.snsUsername ||
          apiReply.authorWallet.slice(0, 15),
    wallet: apiReply.authorWallet,
    content: apiReply.content,
    likes: apiReply.likeCount,
    replies: apiReply.childReplies?.map(apiReplyToReply) || [],
    time: new Date(apiReply.createdAt).toLocaleString(),
    isPremium: apiReply.author.tier === 'premium',
    image: apiReply.imageUrl,
    video: apiReply.videoUrl,
  };
}
```

4. **Update API layer to use API types**
```typescript
// src/lib/api/posts.ts
import { APIPost } from '@/types/api';

export interface PostsResponse {
  posts: APIPost[]; // ✅ Use API type
  total: number;
  page: number;
  limit: number;
}
```

5. **Use adapters in components**
```typescript
// src/app/page.tsx
import { apiPostToPost } from '@/lib/adapters/postAdapter';

// ❌ Before: Manual transformation in component
const transformedPosts = response.posts.map(post => ({
  ...post,
  user: post.author?.username || ...,
  // 30+ lines of manual mapping
}));

// ✅ After: Use adapter
const transformedPosts = response.posts.map(apiPostToPost);
setPosts(transformedPosts);
```

**Verification:**
```bash
# Type check should pass
npm run build

# Verify no manual transformations remain
grep -rn "post.author?.username" src --include="*.tsx"
# Should only find it in adapter file
```

---

## Phase 3: Architectural Improvements (1 week)

### 🎯 Goal: Break down monolithic components, add performance optimizations

### Task 3.1: Break Down page.tsx (3-4 days)

**Current State:** 1444 lines, 28 useState
**Target:** <200 line container, multiple smaller components

**Architecture:**
```
src/app/page.tsx (container, ~150 lines)
  ↓
src/features/feed/
  ├── hooks/
  │   ├── useFeedData.ts          (data fetching)
  │   ├── usePostInteractions.ts  (like/tip/repost)
  │   └── useFeedModals.ts        (modal state)
  ├── components/
  │   ├── FeedContainer.tsx       (main layout)
  │   ├── ComposerSection.tsx     (post creation)
  │   ├── PostsList.tsx           (virtualized list)
  │   ├── FeedPost.tsx            (single post)
  │   └── FeedFilters.tsx         (category filters)
  └── index.ts                    (exports)
```

**Step 1: Extract data fetching hook**
```typescript
// src/features/feed/hooks/useFeedData.ts
import { useState, useEffect, useCallback } from 'react';
import { postsAPI } from '@/lib/api';
import { apiPostToPost } from '@/lib/adapters/postAdapter';
import { Post } from '@/types/post';

export function useFeedData() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await postsAPI.getPosts();
      const transformedPosts = response.posts.map(apiPostToPost);
      setPosts(transformedPosts);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch posts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const addPost = useCallback((newPost: Post) => {
    setPosts(prev => [newPost, ...prev]);
  }, []);

  const updatePost = useCallback((postId: number, updates: Partial<Post>) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p));
  }, []);

  const removePost = useCallback((postId: number) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

  return {
    posts,
    isLoading,
    error,
    fetchPosts,
    addPost,
    updatePost,
    removePost,
  };
}
```

**Step 2: Extract post interactions hook**
```typescript
// src/features/feed/hooks/usePostInteractions.ts
import { useCallback } from 'react';
import { interactionsAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/useToast';

export function usePostInteractions(onPostUpdate: (postId: number, updates: any) => void) {
  const token = useAuthStore(state => state.token);
  const { showSuccess, showError } = useToast();

  const likePost = useCallback(async (postId: number) => {
    if (!token) {
      showError('Please connect your wallet');
      return;
    }

    try {
      const response = await interactionsAPI.likePost(postId, token);
      onPostUpdate(postId, {
        likes: response.liked ? '+1' : '-1',
        isLiked: response.liked
      });
    } catch (error: any) {
      showError(error.message || 'Failed to like post');
    }
  }, [token, onPostUpdate, showSuccess, showError]);

  const repostPost = useCallback(async (postId: number, content?: string) => {
    if (!token) {
      showError('Please connect your wallet');
      return;
    }

    try {
      await interactionsAPI.repost(postId, { content }, token);
      onPostUpdate(postId, { reposts: '+1' });
      showSuccess('Reposted!');
    } catch (error: any) {
      showError(error.message || 'Failed to repost');
    }
  }, [token, onPostUpdate, showSuccess, showError]);

  return {
    likePost,
    repostPost,
  };
}
```

**Step 3: Extract modal management hook**
```typescript
// src/features/feed/hooks/useFeedModals.ts
import { useState, useCallback } from 'react';
import { Post } from '@/types/post';

export function useFeedModals() {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
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

  const closeAllModals = useCallback(() => {
    setShowCreatePost(false);
    setShowTipModal(false);
    setShowReplyModal(false);
    setShowRepostModal(false);
    setShowShareModal(false);
    setSelectedPost(null);
  }, []);

  return {
    showCreatePost,
    setShowCreatePost,
    showTipModal,
    showReplyModal,
    showRepostModal,
    showShareModal,
    selectedPost,
    openTipModal,
    openReplyModal,
    openRepostModal,
    openShareModal,
    closeAllModals,
  };
}
```

**Step 4: Create simplified page.tsx**
```typescript
// src/app/page.tsx
'use client';
import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import { FeedContainer } from '@/features/feed';
import { useWalletAuth } from '@/hooks/useWalletAuth';

export default function Home() {
  const { connected } = useWallet();
  const router = useRouter();
  const { isAuthenticating } = useWalletAuth();

  useEffect(() => {
    if (!connected) {
      router.push('/welcome');
    }
  }, [connected, router]);

  if (!connected || isAuthenticating) {
    return (
      <div className="min-h-screen bg-korus-dark-100 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-korus-dark-100 relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex min-h-screen">
          <LeftSidebar />
          <FeedContainer />
          <RightSidebar />
        </div>
      </div>
    </main>
  );
}
```

**Step 5: Create FeedContainer component**
```typescript
// src/features/feed/components/FeedContainer.tsx
'use client';
import { useState } from 'react';
import { useFeedData } from '../hooks/useFeedData';
import { usePostInteractions } from '../hooks/usePostInteractions';
import { useFeedModals } from '../hooks/useFeedModals';
import { ComposerSection } from './ComposerSection';
import { PostsList } from './PostsList';
import { FeedModals } from './FeedModals';

export function FeedContainer() {
  const { posts, isLoading, addPost, updatePost, removePost } = useFeedData();
  const { likePost, repostPost } = usePostInteractions(updatePost);
  const modals = useFeedModals();

  return (
    <div className="flex-1 lg:ml-80 lg:mr-96 md:ml-64 md:mr-80 md:border-x md:border-korus-border">
      <ComposerSection onPostCreated={addPost} />

      {isLoading ? (
        <div className="p-6">Loading posts...</div>
      ) : (
        <PostsList
          posts={posts}
          onLike={likePost}
          onRepost={modals.openRepostModal}
          onReply={modals.openReplyModal}
          onTip={modals.openTipModal}
          onShare={modals.openShareModal}
        />
      )}

      <FeedModals
        {...modals}
        onPostCreated={addPost}
      />
    </div>
  );
}
```

**Step 6: Create PostsList with virtualization**
```typescript
// src/features/feed/components/PostsList.tsx
import { FixedSizeList as List } from 'react-window';
import { Post } from '@/types/post';
import { FeedPost } from './FeedPost';

interface PostsListProps {
  posts: Post[];
  onLike: (postId: number) => void;
  onRepost: (post: Post) => void;
  onReply: (post: Post) => void;
  onTip: (post: Post) => void;
  onShare: (post: Post) => void;
}

export function PostsList({ posts, onLike, onRepost, onReply, onTip, onShare }: PostsListProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-20 text-korus-textSecondary">
        No posts yet. Be the first to post!
      </div>
    );
  }

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <FeedPost
        post={posts[index]}
        onLike={onLike}
        onRepost={onRepost}
        onReply={onReply}
        onTip={onTip}
        onShare={onShare}
      />
    </div>
  );

  return (
    <List
      height={800}
      itemCount={posts.length}
      itemSize={250}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

**Verification:**
```bash
# Line count should be < 200
wc -l src/app/page.tsx

# State count should be < 5
grep -c "useState" src/app/page.tsx

# Build should succeed
npm run build
```

---

### Task 3.2: Add Performance Optimizations (1 day)

**Install react-window:**
```bash
npm install --save react-window
npm install --save-dev @types/react-window
```

**Step 1: Memoize expensive components**
```typescript
// src/features/feed/components/FeedPost.tsx
import React from 'react';

export const FeedPost = React.memo(({ post, onLike, onRepost, onReply, onTip, onShare }) => {
  // ... component implementation
}, (prevProps, nextProps) => {
  // Only re-render if post data changed
  return prevProps.post.id === nextProps.post.id &&
         prevProps.post.likes === nextProps.post.likes &&
         prevProps.post.replies === nextProps.post.replies &&
         prevProps.post.reposts === nextProps.post.reposts;
});

FeedPost.displayName = 'FeedPost';
```

**Step 2: Add image compression on upload**
```typescript
// src/utils/imageCompression.ts
import imageCompression from 'browser-image-compression';

export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
  };

  try {
    const compressedFile = await imageCompression(file, options);
    console.log(`Compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    return file; // Return original if compression fails
  }
}
```

**Use in CreatePostModal:**
```typescript
// src/components/CreatePostModal.tsx
import { compressImage } from '@/utils/imageCompression';

const handleImageUpload = async (file: File) => {
  // ✅ Compress before upload
  const compressedFile = await compressImage(file);

  // Upload compressed file
  const response = await uploadAPI.uploadImage(compressedFile, token);
  setImageUrl(response.url);
};
```

---

## Phase 4: Polish & Testing (3-5 days)

### 🎯 Goal: Add tests, improve accessibility, final cleanup

### Task 4.1: Set Up Testing Infrastructure (1 day)

**Install testing libraries:**
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
npm install --save-dev @types/jest
```

**Create Jest config:**
```javascript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
};

module.exports = createJestConfig(customJestConfig);
```

**Create setup file:**
```javascript
// jest.setup.js
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  usePathname() {
    return '/';
  },
}));

// Mock Solana wallet
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({
    connected: false,
    publicKey: null,
    signMessage: jest.fn(),
  }),
  useConnection: () => ({
    connection: {},
  }),
}));
```

**Update package.json:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

### Task 4.2: Write Critical Tests (2 days)

**Test 1: Auth store**
```typescript
// src/stores/__tests__/authStore.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../authStore';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.getState().reset();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isAuthenticating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should set token and update isAuthenticated', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setToken('test-token');
    });

    expect(result.current.token).toBe('test-token');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should handle logout', () => {
    const { result } = renderHook(() => useAuthStore());

    // Set token first
    act(() => {
      result.current.setToken('test-token');
    });

    // Then logout
    act(() => {
      result.current.logout();
    });

    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
```

**Test 2: Post adapter**
```typescript
// src/lib/adapters/__tests__/postAdapter.test.ts
import { apiPostToPost } from '../postAdapter';
import { APIPost } from '@/types/api';

describe('postAdapter', () => {
  it('should transform API post to frontend post', () => {
    const apiPost: APIPost = {
      id: 1,
      walletAddress: 'ABC123',
      authorWallet: 'ABC123',
      content: 'Test post',
      category: 'general',
      subcategory: 'discussion',
      createdAt: '2025-01-20T00:00:00Z',
      updatedAt: '2025-01-20T00:00:00Z',
      likeCount: 5,
      replyCount: 3,
      repostCount: 1,
      tipAmount: '0.5',
      author: {
        walletAddress: 'ABC123',
        username: 'testuser',
        tier: 'premium',
      },
    };

    const post = apiPostToPost(apiPost);

    expect(post.id).toBe(1);
    expect(post.user).toBe('testuser');
    expect(post.wallet).toBe('ABC123');
    expect(post.content).toBe('Test post');
    expect(post.likes).toBe(5);
    expect(post.replies).toBe(3);
    expect(post.reposts).toBe(1);
    expect(post.tips).toBe(0.5);
    expect(post.isPremium).toBe(true);
  });

  it('should handle missing author data', () => {
    const apiPost: APIPost = {
      id: 2,
      walletAddress: 'XYZ789',
      authorWallet: 'XYZ789',
      content: 'Test',
      category: 'general',
      subcategory: 'discussion',
      createdAt: '2025-01-20T00:00:00Z',
      updatedAt: '2025-01-20T00:00:00Z',
    };

    const post = apiPostToPost(apiPost);

    expect(post.user).toBe('XYZ789'); // Falls back to truncated wallet
    expect(post.isPremium).toBe(false);
  });
});
```

**Test 3: SafeContent component**
```typescript
// src/components/__tests__/SafeContent.test.tsx
import { render, screen } from '@testing-library/react';
import { SafeContent } from '../SafeContent';

describe('SafeContent', () => {
  it('should render sanitized content', () => {
    render(<SafeContent content="<p>Hello World</p>" />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('should remove script tags', () => {
    render(<SafeContent content="<script>alert('XSS')</script>Test" />);
    expect(screen.queryByText('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should allow links when enabled', () => {
    render(
      <SafeContent
        content='<a href="https://example.com">Link</a>'
        allowLinks={true}
      />
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('should remove links when disabled', () => {
    render(
      <SafeContent
        content='<a href="https://example.com">Link</a>'
        allowLinks={false}
      />
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Link')).toBeInTheDocument();
  });
});
```

**Run tests:**
```bash
npm test
npm run test:coverage
```

---

### Task 4.3: Improve Accessibility (1 day)

**Create accessibility checklist:**
```markdown
# Accessibility Checklist

- [ ] All interactive elements have aria-labels
- [ ] All images have alt text
- [ ] Color contrast meets WCAG AA standards
- [ ] Keyboard navigation works for all features
- [ ] Focus visible on all interactive elements
- [ ] Screen reader announces state changes
- [ ] Forms have proper labels and error messages
- [ ] Modals trap focus and allow ESC to close
```

**Add aria-labels to buttons:**
```typescript
// Find all buttons missing aria-labels
grep -rn "<button" src --include="*.tsx" | grep -v "aria-label"

// Add them:
<button
  onClick={handleLike}
  aria-label={`Like post by ${post.user}`}
>
  {/* icon */}
</button>
```

**Improve modal accessibility:**
```typescript
// src/components/Modal.tsx
import { useEffect, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export function Modal({ isOpen, onClose, children, title }) {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      ref={modalRef}
      className="fixed inset-0 z-50"
    >
      <div className="bg-black/80" onClick={onClose} aria-hidden="true" />
      <div className="modal-content">
        <h2 id="modal-title">{title}</h2>
        {children}
        <button onClick={onClose} aria-label="Close modal">✕</button>
      </div>
    </div>
  );
}
```

---

### Task 4.4: Final Cleanup (1 day)

**Create cleanup script:**
```bash
#!/bin/bash
# scripts/cleanup.sh

echo "🧹 Cleaning up codebase..."

# Remove unused imports
npx eslint src --fix

# Format code
npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,css}"

# Check for TODOs
echo "\n📝 Remaining TODOs:"
grep -rn "TODO\|FIXME\|XXX" src --include="*.ts" --include="*.tsx"

# Check bundle size
npm run build
du -sh .next

echo "\n✅ Cleanup complete!"
```

**Run final checks:**
```bash
chmod +x scripts/cleanup.sh
./scripts/cleanup.sh

# Run all tests
npm test

# Build for production
npm run build

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Progress Tracking

Create a checklist to track progress:

```markdown
# Refactoring Progress

## Phase 1: Quick Wins ⏱️ 1-2 days ✅ COMPLETE
- [x] Fix 69 TypeScript/ESLint errors (Commit: 0820639)
- [x] Add bs58, dompurify, image compression deps (Commit: 3d99f47)
- [x] Replace 263 console statements with logger (Commit: 1ddec24)
- [x] Fix logger infinite recursion bug (Commit: ad6ad0f)

## Phase 2: Critical Fixes ⏱️ 3-5 days (In Progress - 2/3 Complete)
- [ ] Refactor auth hook to use Zustand
- [x] Add input sanitization to all user content (Commits: 4b5fdde, 46e38d7)
- [x] Create type adapters for API/Frontend types (Commit: ef106a7)

## Phase 3: Architectural Improvements ⏱️ 1 week
- [ ] Extract hooks from page.tsx
- [ ] Create FeedContainer component structure
- [ ] Add virtualization with react-window
- [ ] Memoize components with React.memo
- [ ] Add image compression on upload

## Phase 4: Polish & Testing ⏱️ 3-5 days
- [ ] Set up Jest and testing infrastructure
- [ ] Write tests for auth store
- [ ] Write tests for adapters
- [ ] Write tests for SafeContent
- [ ] Add aria-labels to all buttons
- [ ] Improve modal accessibility
- [ ] Run final cleanup and build

## Metrics
- Build errors: 69 → 0 ✅
- Console statements: 263 → 0 ✅
- page.tsx lines: 1444 → <200 (In Progress)
- Test coverage: 0% → 60%+ (Not Started)
```

---

## Additional Fixes Completed (Post-Phase 1)

### User Display & Data Consistency ✅
- **Fixed**: Inconsistent username/premium status display
- **Commit**: `a615276`
- **Changes**: Added missing author fields to backend post queries

### Shoutout Feature Fixes ✅

#### Fix 1: Drawing-Only Post Validation
- **Status**: Complete
- **Commits**: `0db4be5`, `67f58e5`
- **Issue**: Posts with only drawings (no text) failed validation
- **Solution**:
  - Backend: Changed validation to treat empty strings as optional
  - Frontend: Only send content field when text exists

#### Fix 2: Shoutout Queue Detection
- **Status**: Complete
- **Commit**: `07de00b`
- **Issue**: Modal showed "No queue" even with active shoutout
- **Solution**:
  - Added shoutoutQueueInfo state
  - Connected backend queue data to frontend
  - Updated ShoutoutModal to use actual queue state

#### Fix 3: Countdown Timer & Queue Display
- **Status**: Complete
- **Commit**: `889d5df`
- **Issue**: No countdown on active shoutouts, incorrect wait times
- **Solution**:
  - Added shoutoutExpiresAt to Post type
  - Updated ShoutoutCountdown to use expiresAt from backend
  - Display countdown on homepage shoutouts
  - Fixed calculateWaitTime in ShoutoutModal

### Phase 2.2: Input Sanitization ✅ COMPLETE

- **Task**: Add XSS protection to all user-generated content
- **Commits**: `4b5fdde`, `46e38d7`
- **Components Created**:
  - `src/utils/sanitize.ts` - Sanitization utilities with DOMPurify
  - `src/components/SafeContent.tsx` - Safe HTML rendering component

- **Protection Applied To**:
  - Homepage feed (regular posts, repost comments, reposted content)
  - Post detail page (/post/[id]) - main post and all replies
  - Profile page - user posts display
  - PostCard component - reusable post card

- **Security Features**:
  - Configurable HTML sanitization
  - URL validation (http/https/ipfs only)
  - Script tag blocking
  - Data attribute blocking
  - Memoized components for performance

### Phase 2.3: Type Unification ✅ COMPLETE

- **Task**: Unify type definitions between frontend and backend
- **Commit**: `ef106a7`
- **Components Created**:
  - `src/types/api.ts` - Complete API types matching backend
    - APIPost, APIReply, APIAuthor
    - APIPostsResponse, APIPostResponse
    - CreatePostRequest, CreateReplyRequest
    - APIShoutoutQueue, APIUserProfile
  - `src/lib/adapters/postAdapter.ts` - Type transformation layer
    - apiPostToPost() - API post → UI post
    - apiReplyToReply() - API reply → UI reply
    - Centralized display name/time formatting logic

- **Updates**:
  - `src/lib/api/posts.ts` - Now uses API types for return values

- **Benefits**:
  - Single source of truth for backend structure
  - Type safety between frontend/backend
  - Centralized transformation logic
  - Eliminates manual mapping duplication
  - Easier maintenance when backend changes

---

## Success Criteria

✅ **Build succeeds with 0 errors**
✅ **All tests pass with >60% coverage**
✅ **page.tsx is <200 lines**
✅ **No console.log in production**
✅ **Types are unified across frontend/backend**
✅ **All user content is sanitized**
✅ **Authentication uses proper React state**
✅ **Performance is improved (memoization + virtualization)**
✅ **Accessibility score improves (WCAG AA)**

---

## Notes

- **Don't rush:** Quality over speed
- **Test as you go:** Don't wait until the end
- **Git commits:** Make small, atomic commits for each task
- **Documentation:** Update this file as you complete tasks
- **Ask for help:** If stuck, consult the team or Claude

---

**Good luck! 🚀**
