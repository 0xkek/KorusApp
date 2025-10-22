# Resume for Claude - Korus Development Session

## Session Overview
**Date**: October 2025
**Branch**: `devnet-testing`
**Commit**: `611da1f`
**Status**: Successfully completed reply repost implementation with Mastodon-inspired architecture

---

## What We Accomplished

### 1. Reply Repost Count Tracking ✅
**Problem**: Reply repost counts were staying at 0 when users reposted replies.

**Solution**:
- Added `repostCount Int @default(0)` field to Reply model in Prisma schema
- Updated repostController.ts to increment/decrement repostCount for replies
- Ran database migration with `npx prisma db push` and regenerated Prisma types

**Files Modified**:
- `korus-backend/prisma/schema.prisma:132` - Added repostCount field
- `korus-backend/src/controllers/repostController.ts:148-153, 204-209` - Increment/decrement logic

---

### 2. NFT Avatar Data Integrity Fix ✅
**Problem**: Backend console showed 404 errors when fetching NFT avatars because image URLs were being stored instead of mint addresses.

**Solution**:
- Fixed edit-profile page to send NFT mint addresses instead of image URLs
- Added backward compatibility to handle existing URL data
- Added detection logic to differentiate URLs (old data) from mint addresses (new data)

**Files Modified**:
- `korus-web/src/app/edit-profile/page.tsx:92-101, 148-154` - Send mint addresses with backward compatibility
- `korus-web/src/app/page.tsx:186-205` - Backward compatibility in post composer

**Key Code Pattern**:
```typescript
const isUrl = nftAvatar.startsWith('http://') || nftAvatar.startsWith('https://');
if (isUrl) {
  // Old data: use URL directly
  setUserAvatar(nftAvatar);
} else {
  // New data: resolve mint address to image URL
  const nft = await nftsAPI.getNFTByMint(nftAvatar);
  setUserAvatar(nft.image);
}
```

---

### 3. Repost Duplicate API Call Fix ✅
**Problem**: RepostModal was making the API call, then triggering `toggleRepost()` which made another API call, causing race conditions and duplicate posts.

**Solution**:
- Modified RepostModal to pass the API response object to the callback
- Created `handleRepostResponse` function that processes the response without making another API call
- Updated interaction state management

**Files Modified**:
- `korus-web/src/components/RepostModal.tsx:17, 70` - Pass response to callback
- `korus-web/src/app/page.tsx:872-970` - New handleRepostResponse function
- `korus-web/src/app/page.tsx:1742-1747` - Updated callback

**Flow Before**:
```
RepostModal.repostPost() → API call → success → onRepostSuccess()
  → toggleRepost() → ANOTHER API call → race condition
```

**Flow After**:
```
RepostModal.repostPost() → API call → success → onRepostSuccess(response)
  → handleRepostResponse() → update state only (no API call)
```

---

### 4. Reply Repost Support (Mastodon-Inspired Architecture) ✅
**Problem**: Reply reposts were displaying as regular posts without showing the original reply author's information in a repost frame.

**Root Cause Analysis**:
- Backend's `repostController.ts` returns `originalReply` data when creating reply reposts
- BUT `postsController.ts` (getPosts) only included `originalPost` in the query
- Reply reposts created during the session worked via WebSocket
- BUT when refreshing or paginating, reply reposts had no `originalReply` data

**Solution - Backend**:
Added logic to `getPosts` controller to manually fetch and attach `originalReply` data for reply reposts (posts with `isRepost=true` and `originalPostId=null`):

```typescript
// Fetch original reply data for reply reposts
const postsWithReplyData = await Promise.all(
  result.data.map(async (post: any) => {
    if (post.isRepost && !post.originalPostId) {
      // Find the original reply by matching content
      const originalReply = await prisma.reply.findFirst({
        where: {
          content: post.content,
          authorWallet: { not: post.authorWallet }
        },
        include: { author: { select: { ... } } },
        orderBy: { createdAt: 'asc' }
      })

      if (originalReply) {
        return { ...post, originalReply: { ... } }
      }
    }
    return post
  })
)
```

**Solution - Frontend**:
Updated post transformation logic to handle both `originalPost` AND `originalReply`:

```typescript
repostedPost: post.isRepost ? (
  post.originalPost ? {
    // Post repost transformation
  } : post.originalReply ? {
    // Reply repost transformation
  } : undefined
) : undefined
```

**Files Modified**:
- `korus-backend/src/controllers/postsController.ts:287-341` - Fetch originalReply data
- `korus-backend/src/controllers/repostController.ts:230-248` - Return originalReply on creation
- `korus-web/src/app/page.tsx:124-163, 247-286` - Transform originalReply in both pagination and WebSocket
- `korus-web/src/app/page.tsx:872-970` - Handle originalReply in handleRepostResponse

---

## Technical Architecture Insights (Mastodon Research)

We researched Mastodon's open-source implementation to understand how they handle boosts (reposts):

### Mastodon's Approach:
1. **Nested Structure**: When you boost a status, Mastodon creates a NEW status entity with the original nested inside a `reblog` field
2. **Single ID**: The top-level ID is the boost itself, NOT the original post
3. **API Response**: Returns the new Status with the original nested inside:
   ```json
   {
     "id": "123456",  // Boost ID
     "reblog": {
       "id": "111111",  // Original post ID
       "content": "...",
       "account": { ... }  // Original author
     },
     "account": { ... }  // Person who boosted
   }
   ```

### How We Applied This to Korus:
- **Post reposts**: New Post with `originalPost` nested (via Prisma relation)
- **Reply reposts**: New Post with `originalReply` manually attached (no DB relation exists)
- Both display in a repost frame showing:
  - Reposter's info at top with "👤 reposted" indicator
  - Original content in bordered box below with original author's info

---

## Current State & Known Issues

### ✅ Working Features:
1. Reply repost count tracking and display
2. Post repost count tracking and display
3. NFT avatar data integrity (mint addresses)
4. Backward compatibility for existing URL data
5. Duplicate API call prevention
6. Reply repost creation with originalReply data
7. Reply repost display in feeds (pagination and WebSocket)
8. Proper state management without race conditions

### ⚠️ Known Issues:
1. **Notification FK Constraint for Reply Reposts**:
   - Error: `Foreign key constraint violated on notifications_postId_fkey`
   - Occurs when creating notifications for reply reposts
   - Reply reposts don't have a valid `postId` to link notifications to
   - Location: `korus-backend/src/utils/notifications.ts:41`
   - Impact: Notifications fail silently for reply reposts (non-blocking)

2. **Legacy NFT Avatar Data**:
   - Some users still have image URLs stored in `nftAvatar` field instead of mint addresses
   - Backward compatibility added to handle both formats
   - Users will migrate to mint addresses when they update their avatars

---

## File Changes Summary

### Backend (13 files changed, 991 insertions, 180 deletions)

#### Schema Changes:
- `prisma/schema.prisma` - Added repostCount to Reply model

#### Controller Changes:
- `src/controllers/repostController.ts` - Reply repost creation with originalReply data
- `src/controllers/postsController.ts` - Fetch and attach originalReply in getPosts
- `src/controllers/repliesController.ts` - Minor updates
- `src/controllers/interactionsController.ts` - Minor updates
- `src/controllers/authController.ts` - Minor updates

### Frontend (7 files changed)

#### Core Pages:
- `src/app/page.tsx` - Reply repost transformation, handleRepostResponse, NFT backward compatibility
- `src/app/post/[id]/page.tsx` - Similar transformations for post detail page
- `src/app/edit-profile/page.tsx` - Send mint addresses with backward compatibility

#### Components:
- `src/components/RepostModal.tsx` - Pass response object to callback

#### API/Types:
- `src/lib/api/client.ts` - API client improvements
- `src/lib/api/users.ts` - User API improvements
- `src/types/post.ts` - Type definitions for originalReply

---

## Testing Checklist

### To Verify Reply Reposts Are Working:

1. **Create a Reply Repost**:
   - Go to a post with replies
   - Click repost button on a reply
   - Add optional comment
   - Submit

2. **Check Display**:
   - ✅ Repost appears in feed with repost indicator
   - ✅ Shows reposter's name at top
   - ✅ Shows original reply content in bordered frame
   - ✅ Shows original reply author's name and avatar
   - ✅ Shows timestamp of original reply
   - ✅ Shows repost count incremented on original reply

3. **Check Persistence**:
   - Refresh the page
   - ✅ Reply repost still displays correctly
   - Paginate through posts
   - ✅ Reply repost loads with originalReply data

4. **Check Unrepost**:
   - Click repost button again to unrepost
   - ✅ Repost removed from feed
   - ✅ Repost count decremented on original reply

---

## Next Steps / Potential Improvements

### High Priority:
1. **Fix Notification FK Constraint for Reply Reposts**:
   - Options:
     a) Store reply ID in a separate field (replyId)
     b) Make postId nullable and add replyId field
     c) Store both in a polymorphic relationship
   - Recommended: Add `replyId String?` field to Notification model

2. **Add Database Relation for originalReply**:
   - Currently using content matching to find original reply
   - Better approach: Store `originalReplyId` on Post model
   - Would require schema change and migration

### Medium Priority:
3. **Complete NFT Avatar Migration**:
   - Create migration script to convert all URLs to mint addresses
   - Query NFT metadata for existing URLs
   - Update database records

4. **Performance Optimization**:
   - The `findFirst` query for originalReply could be slow with many replies
   - Consider caching or indexing

### Low Priority:
5. **Enhanced Repost Frame UI**:
   - Add visual differentiation between post reposts and reply reposts
   - Show parent post context for reply reposts
   - Add "View conversation" link for reply reposts

---

## Key Code Locations for Future Reference

### Backend:
- **Reply Repost Creation**: `korus-backend/src/controllers/repostController.ts:33-318`
- **Reply Data Fetching**: `korus-backend/src/controllers/postsController.ts:287-341`
- **Notification Error**: `korus-backend/src/utils/notifications.ts:41`

### Frontend:
- **Post Transformation**: `korus-web/src/app/page.tsx:250-305` (pagination), `272-330` (WebSocket)
- **Repost Response Handler**: `korus-web/src/app/page.tsx:872-970`
- **Repost Display**: `korus-web/src/app/page.tsx:1468-1520`
- **NFT Backward Compatibility**: `korus-web/src/app/edit-profile/page.tsx:92-101`

---

## Architecture Decisions & Rationale

### Why Not Use Database Relation for originalReply?
The Post model has `originalPostId` which creates a Prisma relation to the Post table. We can't have `originalReplyId` pointing to the Reply table because:
1. Prisma doesn't support union types (either post OR reply)
2. Would need to make originalPostId nullable and add originalReplyId
3. Would require database migration on existing reply reposts
4. Current approach (content matching) works but could be optimized

### Why Pass Response Object in RepostModal?
Original implementation had RepostModal → API call → callback → toggleRepost → ANOTHER API call. This caused:
- Duplicate API requests
- Race conditions with WebSocket updates
- Posts appearing/disappearing

New approach: RepostModal → API call → callback with response → handleRepostResponse (state update only). This:
- Eliminates duplicate API calls
- Prevents race conditions
- Lets WebSocket and local state coexist peacefully

### Why Backward Compatibility for NFT Avatars?
When we discovered the bug (URLs being sent instead of mint addresses), we had two options:
1. Break existing data and force all users to re-set avatars
2. Support both formats during transition

We chose option 2 for better UX. The detection logic checks if the value starts with `http://` or `https://` to determine if it's a URL (old) or mint address (new).

---

## Commands to Resume Development

```bash
# Backend
cd /Users/maxattard/KorusApp/korus-backend
npm run dev

# Frontend
cd /Users/maxattard/KorusApp/korus-web
npm run dev

# Database
cd /Users/maxattard/KorusApp/korus-backend
npx prisma studio  # GUI for database
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma db push  # Push schema changes to database
```

---

## Useful Debugging Info

### Check if Reply Repost Has originalReply Data:
```javascript
console.log('Repost data:', {
  isRepost: post.isRepost,
  originalPostId: post.originalPostId,  // null for reply reposts
  hasOriginalPost: !!post.originalPost,
  hasOriginalReply: !!post.originalReply,
  originalReply: post.originalReply
});
```

### Check NFT Avatar Format:
```javascript
const isUrl = nftAvatar?.startsWith('http://') || nftAvatar?.startsWith('https://');
console.log('NFT Avatar:', { nftAvatar, isUrl });
```

### Monitor Repost API Calls:
Look for this pattern in browser console:
```
[RepostModal] handleRepost called
[API Client] Making request: POST /api/interactions/posts/.../repost
[RepostModal] Got response
[handleRepostResponse] Processing repost
```

Should only see ONE API request, not two!

---

**End of Resume**

*This document provides a complete overview of the development session and should allow any developer (or Claude) to understand what was accomplished, why decisions were made, and how to continue the work.*
