# Type Standardization - Implementation Guide

**Date:** 2025-10-08
**Status:** Completed

---

## Overview

Created centralized type definitions in `/src/types` to standardize the data structure across the application, particularly for the `Post` and `Reply` interfaces.

---

## Changes Made

### 1. Created Shared Type Definitions

**File:** `/src/types/post.ts`

```typescript
export interface Reply {
  id: number;
  user: string;
  wallet?: string;
  content: string;
  likes: number;
  replies: Reply[]; // Nested replies (threaded conversations)
  time: string;
  isPremium?: boolean;
  isExpanded?: boolean;
  image?: string;
  videoUrl?: string;
}

export interface Post {
  id: number;
  user: string;
  wallet?: string;
  content: string;
  likes: number;
  replies: number; // Count of replies, NOT the actual reply objects
  tips: number;
  time: string;
  isPremium?: boolean;
  isShoutout?: boolean;
  isSponsored?: boolean;
  image?: string;
  imageUrl?: string;
  videoUrl?: string;
  shoutoutDuration?: number;
  shoutoutStartTime?: number;
  category?: string;
  subcategory?: string;
}

export interface UserStats {
  posts: number;
  replies: number;
  tipsReceived: number;
  tipsGiven: number;
  repScore: number;
}

export interface UserInfo {
  wallet: string;
  username: string | null;
  avatar: string;
  isPremium: boolean;
  bio?: string;
  snsDomains?: string[];
  favoriteDomain?: string | null;
}
```

**File:** `/src/types/index.ts`

```typescript
export type { Post, Reply, UserStats, UserInfo } from './post';
```

---

## Key Design Decisions

### 1. **Post.replies is a number, not an array**
- `Post.replies` represents the **count** of replies
- Actual reply objects are stored separately (e.g., in a `replies` state array)
- This separation allows efficient feed rendering without loading all reply data upfront

### 2. **Reply.replies is an array**
- For threaded conversations, `Reply` objects can contain nested `Reply[]`
- This enables recursive rendering of reply threads

### 3. **Migration Path for SearchModal**
- SearchModal currently handles both formats during migration:
  ```typescript
  interface Post extends Omit<BasePost, 'replies'> {
    replies: number | any[];
    replyThreads?: any[];
  }
  ```
- This allows gradual migration without breaking existing functionality

---

## Files Updated

1. ✅ `/src/types/post.ts` - Created
2. ✅ `/src/types/index.ts` - Created
3. ✅ `/src/app/page.tsx` - Updated to use shared `Post` type
4. ✅ `/src/components/PostCard.tsx` - Updated to use shared `Post` type
5. ✅ `/src/components/SearchModal.tsx` - Updated with migration pattern
6. ✅ `/src/app/post/[id]/page.tsx` - Updated to use shared `Post` and `Reply` types

---

## Files That Should Be Updated (Future Work)

The following files still have local interface definitions that should be migrated:

- `/src/components/ReplyModal.tsx`
- `/src/components/PostDetailModal.tsx`
- `/src/app/search/page.tsx`
- `/src/app/profile/page.tsx`
- `/src/app/profile/[wallet]/page.tsx`
- `/src/app/games/page.tsx`
- `/src/app/events/page.tsx`

---

## Usage Examples

### Import shared types:
```typescript
import type { Post, Reply, UserStats, UserInfo } from '@/types';
```

### Using Post type:
```typescript
const [posts, setPosts] = useState<Post[]>([]);

const newPost: Post = {
  id: Date.now(),
  user: 'username',
  content: 'Post content',
  likes: 0,
  replies: 0, // Count of replies
  tips: 0,
  time: 'now',
};
```

### Using Reply type with threading:
```typescript
const [replies, setReplies] = useState<Reply[]>([]);

const newReply: Reply = {
  id: Date.now(),
  user: 'username',
  content: 'Reply content',
  likes: 0,
  replies: [], // Nested replies array
  time: 'now',
};
```

---

## Benefits

1. **Type Safety** - Consistent types across the application
2. **Single Source of Truth** - All type definitions in one place
3. **Easier Refactoring** - Change type once, updates everywhere
4. **Better IDE Support** - Autocomplete and type checking
5. **Documentation** - Types serve as inline documentation
6. **Prevents Bugs** - Catches type mismatches at compile time

---

## Next Steps

1. Gradually migrate remaining components to use shared types
2. Add JSDoc comments to type definitions for better documentation
3. Consider creating additional shared types for:
   - Notification interface
   - Comment interface
   - Event/Game interfaces
4. Add utility types for common patterns (e.g., `PostWithReplies`)

---

**Completed:** 2025-10-08
