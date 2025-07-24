# Removed Features Documentation

This file tracks features that were temporarily removed to simplify the Korus app UX. Each feature includes implementation details and code snippets for easy re-implementation.

## Table of Contents
1. [Bump Feature](#bump-feature)
2. [Particle System](#particle-system)
3. [Sponsored Posts](#sponsored-posts)
4. [Subcategory Navigation](#subcategory-navigation)
5. [Complex Badge System](#complex-badge-system)
6. [Multiple Blur Effects](#multiple-blur-effects)
7. [Excessive Shadows/Glows](#excessive-shadows-glows)

---

## Bump Feature

**What it did**: Allowed users to "bump" a post to the top of the feed for 5 minutes

**Why removed**: Unclear purpose, adds cognitive load, clutters post actions

**Code location**: 
- `components/Post.tsx` - handleBump function
- `app/(tabs)/index.tsx` - handleBump, isBumpActive, sorting logic
- `types/index.ts` - bumped, bumpedAt, bumpExpiresAt fields

**Key implementation**:
```tsx
// Check if bump is active
const isBumpActive = (post: PostType): boolean => {
  if (!post.bumped || !post.bumpedAt || !post.bumpExpiresAt) return false;
  return Date.now() < post.bumpExpiresAt;
};

// Handle bump action
const handleBump = (postId: number) => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  setPosts(posts.map(post => {
    if (post.id === postId) {
      return { 
        ...post, 
        bumped: true, 
        bumpedAt: Date.now(),
        bumpExpiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
      };
    }
    return post;
  }));
};

// Sorting with bump priority
const sortedPosts = [...posts].sort((a, b) => {
  const aActive = isBumpActive(a);
  const bActive = isBumpActive(b);
  if (aActive && !bActive) return -1;
  if (!aActive && bActive) return 1;
  return b.id - a.id;
});
```

**UI Elements Removed**:
- Bump button in post actions
- Bump count display
- Bumped post visual indicators (special border/glow)

---

## Particle System

**What it did**: Animated particles floating around the screen for visual interest

**Why removed**: Performance impact, visual clutter, distracts from content, no functional value

**Code location**:
- `components/ParticleSystem.tsx` - Main particle system component
- `app/(tabs)/notifications.tsx` - Wrapped the entire screen
- `app/(tabs)/index.tsx` - Wrapped the home screen
- Also used in events.tsx and post detail pages

**Key implementation**:
```tsx
// Wrapped entire screens
<ParticleSystem>
  <View style={styles.container}>
    {/* Screen content */}
  </View>
</ParticleSystem>
```

**Performance impact**:
- Continuous animations running in background
- Multiple animated values per particle
- Unnecessary re-renders
- Battery drain on mobile devices

---

## Sponsored Posts

**What it did**: Highlighted posts with "Sponsored" badge and special styling

**Why removed**: Adds visual complexity, not core MVP feature

**Code location**:
- `components/Post.tsx` - isSponsored prop and styling
- `data/mockData.ts` - isSponsored field

**Visual changes**:
- Golden gradient border
- "Sponsored" badge
- Special shadow effects

---

## Subcategory Navigation

**What it did**: Complete subcategory system with dropdown navigation and display in posts

**Why removed**: Overwhelming complexity, unnecessary categorization depth, takes up screen space

**Code removed**:
1. **Type definition** - `subcategory` field removed from Post type
2. **UI Components**:
   - Subcategory dropdown in Header
   - Subcategory selection in CreatePostModal
   - Subcategory display in posts (under username)
3. **Files deleted**:
   - `app/subcategory-feed.tsx` - Entire subcategory feed page
   - `subtopicData` from mockData.ts
4. **Function signatures updated**:
   - `handleCreatePost` - Removed subcategory parameter
   - `CreatePostModal.onSubmit` - Removed subcategory parameter

**Original implementation**:
```tsx
// Post type
interface Post {
  category: string;
  subcategory: string;
  // ...
}

// CreatePostModal
onSubmit: (category: string, subcategory: string, imageUrl?: string, gameData?: GameData) => void;

// Post display
<Text style={styles.subcategoryDot}>•</Text>
<Text style={styles.subcategory}>{post.subcategory}</Text>

// Original categories with subcategories
const subcategories = {
  CAREER: ['Job Search', 'Interviews', 'Networking', 'Salary Negotiations'],
  HEALTH: ['Mental Health', 'Fitness', 'Nutrition', 'Medical'],
  // ... etc for all 12 categories
};
```

**Simplified to 5 main categories only**:
```
GENERAL, TECH, FINANCE, LIFESTYLE, GAMING
```

---

## Complex Badge System

**What it did**: Multiple badge types (Premium, Verified, Top Replier, Tip amounts)

**Why removed**: Too many visual indicators competing for attention, creates visual hierarchy confusion

**Types removed**:
- **Top Reply badge** - Star icon with "Top Reply" text for best-voted replies
- **Tip amount badges** - "+X $ALLY" badges showing tip totals on posts
- **Verified badges** - Additional verification indicators beyond premium

**Code removed**:
```tsx
// Top Reply Badge
{index === 0 && replySortType === 'best' && (
  <LinearGradient colors={gradients.primary} style={styles.topReplyBadge}>
    <Ionicons name="star" size={14} />
    <Text>Top Reply</Text>
  </LinearGradient>
)}

// Tip Amount Badge
{post.tips > 0 && (
  <LinearGradient colors={gradients.primary} style={styles.tipBadge}>
    <Text>+{post.tips} $ALLY</Text>
  </LinearGradient>
)}
```

**Kept**: Premium badge only (gold checkmark) - Simple, clear indicator of paid users

---

## Multiple Blur Effects

**What it did**: Blur effects on modals, cards, and various UI elements

**Why removed**: Performance impact, visual overload when combined with gradients

**Code snippets**:
```tsx
import { BlurView } from 'expo-blur';

<BlurView intensity={10} style={styles.blurContainer}>
  {/* Content */}
</BlurView>
```

---

## Excessive Shadows/Glows

**What it did**: Multiple shadow layers, glowing effects on buttons and cards

**Why removed**: Creates visual noise, makes content harder to focus on

**Examples**:
```tsx
// Removed
shadowColor: colors.primary,
shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.3,
shadowRadius: 8,
elevation: 10,

// Simplified to
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.1,
shadowRadius: 4,
elevation: 2,
```

---

## Reduced Visual Effects

**What was changed**: Reduced shadow intensity, blur effects, and text glow throughout the app

**Why changed**: Performance improvement, cleaner visual appearance, reduced visual noise

**Changes made**:
1. **Blur Effects** - Removed expo-blur components for better performance
2. **Shadows** - Reduced from heavy shadows to subtle ones:
   - Before: `shadowOpacity: 0.8, shadowRadius: 35`
   - After: `shadowOpacity: 0.08-0.15, shadowRadius: 2-6`
3. **Text Shadows** - Reduced glow effects on text:
   - Before: `textShadowRadius: 8-15`
   - After: `textShadowRadius: 2-4`

**Files modified**:
- `components/Post.tsx` - Reduced all shadow effects
- `components/Header.tsx` - Removed BlurView, reduced shadows
- `components/CreatePostModal.tsx` - Removed BlurView, reduced shadows
- `components/TipModal.tsx` - Removed BlurView, reduced shadows
- `components/KorusAlert.tsx` - Removed BlurView, reduced shadows

**Original shadow/blur values for restoration**:
```tsx
// Heavy shadows (removed)
shadowOffset: { width: 0, height: 8 },
shadowOpacity: 0.8,
shadowRadius: 35,
elevation: 15,

// Blur effects (removed)
<BlurView intensity={40-60} style={styles.blurWrapper}>

// Text glow (reduced)
textShadowRadius: 8-15,
```

---

## Re-implementation Guide

To re-add any feature:
1. Check the code location noted above
2. Review the git history for exact implementation
3. Consider if the feature aligns with simplified UX goals
4. Test performance impact before re-adding

## Notes

These features aren't deleted, just commented out or simplified. The core functionality remains in the codebase for easy restoration.