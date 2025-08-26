# Fix for Backend Rate Limiter Build Error

The build is failing because `RedisStore` is still referenced in line 25 of `advancedRateLimiter.ts`.

## Quick Fix

In the file `korus-backend/src/middleware/advancedRateLimiter.ts`, replace the entire `createRedisStore` function (around lines 10-33) with:

```typescript
// Create a Redis client if available (for production)
const createRedisStore = () => {
  // Redis store disabled until rate-limit-redis package is installed
  // To enable: npm install rate-limit-redis
  return undefined;
};
```

This will use the default memory store for rate limiting, which is fine for now.

## Alternative: Install the Package

If you want Redis-based rate limiting (recommended for production with multiple instances):

1. Add to `package.json`:
```json
"rate-limit-redis": "^4.2.0"
```

2. Uncomment the import at the top of the file:
```typescript
import RedisStore from 'rate-limit-redis';
```

3. Use the original createRedisStore function.