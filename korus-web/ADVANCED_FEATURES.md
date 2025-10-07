# Advanced Features Guide

This document covers advanced features and optimizations in the Korus web app.

## Error Boundaries

Graceful error handling with React Error Boundaries.

### Usage

```tsx
import { ErrorBoundary, ModalErrorBoundary } from '@/components/ErrorBoundary';

// Wrap entire app (already done in layout.tsx)
<ErrorBoundary>
  <YourApp />
</ErrorBoundary>

// Wrap individual modals
<ModalErrorBoundary>
  <YourModal />
</ModalErrorBoundary>

// Custom fallback
<ErrorBoundary
  fallback={<CustomErrorUI />}
  onError={(error, errorInfo) => logToService(error)}
>
  <Component />
</ErrorBoundary>
```

**Features:**
- Catches JavaScript errors in component tree
- Displays user-friendly error UI
- Provides "Try Again" and "Go Home" actions
- Shows error details in development mode
- Custom error callbacks for logging

---

## Virtual Scrolling

High-performance rendering for long lists (1000+ items).

### VirtualList

```tsx
import { VirtualList } from '@/components/VirtualList';

function PostFeed({ posts }) {
  return (
    <VirtualList
      items={posts}
      height={800}
      itemHeight={200}
      overscan={3}
      renderItem={(post, index) => <PostCard key={post.id} post={post} />}
    />
  );
}
```

### VirtualGrid

```tsx
import { VirtualGrid } from '@/components/VirtualList';

function NFTGallery({ nfts }) {
  return (
    <VirtualGrid
      items={nfts}
      height={600}
      itemHeight={250}
      columns={3}
      gap={16}
      renderItem={(nft) => <NFTCard nft={nft} />}
    />
  );
}
```

**When to use:**
- Lists with 100+ items
- Grids with many images
- Infinite scroll feeds
- Performance-critical UIs

---

## Infinite Scroll

Load more content as user scrolls.

### Usage

```tsx
import { useInfiniteScroll } from '@/hooks/useIntersectionObserver';

function Feed() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (loading) return;
    setLoading(true);
    const newPosts = await fetchPosts(page + 1);
    setPosts([...posts, ...newPosts]);
    setPage(page + 1);
    setLoading(false);
  };

  const sentinelRef = useInfiniteScroll(loadMore, {
    rootMargin: '100px', // Trigger 100px before bottom
    enabled: !loading,
  });

  return (
    <div>
      {posts.map(post => <PostCard key={post.id} post={post} />)}
      {loading && <FeedSkeleton count={3} />}
      <div ref={sentinelRef} className="h-10" />
    </div>
  );
}
```

### Intersection Observer

```tsx
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

function LazyImage({ src }) {
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    freezeOnceVisible: true,
  });

  return (
    <div ref={ref}>
      {isIntersecting ? (
        <img src={src} alt="Lazy loaded" />
      ) : (
        <Skeleton variant="rectangular" height={200} />
      )}
    </div>
  );
}
```

---

## Form Validation with Zod

Type-safe form validation schemas.

### Pre-built Schemas

```tsx
import { postSchema, useFormValidation } from '@/utils/validation';

function CreatePost() {
  const { errors, validate } = useFormValidation(postSchema);
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    const formData = { content, images: [] };

    if (validate(formData)) {
      // formData is now type-safe!
      submitPost(formData);
    }
  };

  return (
    <div>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        variant={errors.content ? 'error' : 'default'}
        helperText={errors.content}
      />
      <Button onClick={handleSubmit}>Post</Button>
    </div>
  );
}
```

### Available Schemas

- `postSchema` - Post creation/editing
- `replySchema` - Reply creation
- `profileSchema` - Profile updates
- `tipSchema` - SOL tip validation
- `shoutoutSchema` - Shoutout creation
- `reportSchema` - Content reporting

### Custom Schemas

```tsx
import { z } from 'zod';

const customSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  age: z.number().min(13).max(120),
});

const { errors, validate } = useFormValidation(customSchema);
```

---

## Web Vitals & Analytics

Monitor Core Web Vitals and track user events.

### Core Web Vitals

Automatically monitored (already setup in `layout.tsx`):
- **LCP** (Largest Contentful Paint) - Loading performance
- **FID** (First Input Delay) - Interactivity
- **CLS** (Cumulative Layout Shift) - Visual stability
- **FCP** (First Contentful Paint) - Perceived load speed
- **TTFB** (Time to First Byte) - Server response time
- **INP** (Interaction to Next Paint) - Responsiveness

Results are logged to console in development.

### Event Tracking

```tsx
import { analytics } from '@/utils/analytics';

// Track post creation
analytics.postCreated();

// Track wallet connection
analytics.walletConnected('Phantom');

// Track tips
analytics.tipSent(0.5); // 0.5 SOL

// Track custom events
import { trackEvent } from '@/utils/analytics';
trackEvent('custom_event', { property: 'value' });
```

### Performance Marks

```tsx
import { performanceMark, performanceMeasure } from '@/utils/analytics';

// Start timing
performanceMark('fetchStart');

await fetchData();

performanceMark('fetchEnd');

// Measure duration
performanceMeasure('dataFetch', 'fetchStart', 'fetchEnd');
// Console: ⏱️  dataFetch: 234ms
```

### Error Tracking

```tsx
import { trackError } from '@/utils/analytics';

try {
  riskyOperation();
} catch (error) {
  trackError(error, { context: 'user_action' });
}
```

---

## Best Practices

### Performance
1. Use `VirtualList` for lists with 100+ items
2. Use `useInfiniteScroll` for feeds instead of pagination
3. Monitor Web Vitals regularly
4. Lazy load images with `useIntersectionObserver`

### Error Handling
1. Wrap app with `ErrorBoundary` (already done)
2. Wrap modals with `ModalErrorBoundary`
3. Log errors to analytics service
4. Provide user-friendly error messages

### Forms
1. Always validate with Zod schemas
2. Show inline errors with `helperText`
3. Disable submit while validating
4. Clear errors on field change

### Analytics
1. Track all user interactions
2. Monitor Core Web Vitals
3. Set up custom analytics endpoint
4. Use performance marks for slow operations

---

## Configuration

### Analytics Endpoint

Add to `.env.local`:

```bash
NEXT_PUBLIC_ANALYTICS_ENDPOINT=https://your-analytics.com/api/events
```

### Google Analytics

Add to `<head>` in `layout.tsx`:

```tsx
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script dangerouslySetInnerHTML={{
  __html: `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'GA_MEASUREMENT_ID');
  `
}} />
```

---

## Testing

### Test Error Boundaries

```tsx
// Trigger error in development
<button onClick={() => { throw new Error('Test error'); }}>
  Trigger Error
</button>
```

### Test Virtual Scroll

```tsx
// Generate large dataset
const items = Array.from({ length: 10000 }, (_, i) => ({ id: i, name: `Item ${i}` }));

<VirtualList items={items} height={600} itemHeight={50} renderItem={(item) => <div>{item.name}</div>} />
```

### Test Form Validation

```tsx
const formData = { content: 'a'.repeat(300) }; // Over 280 char limit
validate(formData); // Should show error
```
