# Fixing Production Issues

## Issue 1: App Icon Not Showing

### Quick Fix:
1. Create/get your Korus logo (512x512 PNG)
2. Replace these files:
   - `/assets/images/icon.png` - Main icon (512x512)
   - `/assets/images/adaptive-icon.png` - Android adaptive icon (512x512)
   - Make sure background is not transparent

### Rebuild:
```bash
eas build -p android --profile production
```

## Issue 2: Replies Not Persisting

### The Problem:
Replies are being saved but not loaded when app restarts. This could be:
1. Backend not saving replies correctly
2. Frontend not fetching replies on app load
3. Mock data overriding real data

### Debug Steps:

1. **Check Backend Logs**
   - Go to Render dashboard
   - Check logs when creating a reply
   - Look for any errors

2. **Test API Directly**
   ```bash
   # Get posts (replace with actual post ID)
   curl https://korus-backend.onrender.com/api/posts/1/replies
   ```

3. **Check Mock Mode**
   - Verify `MOCK_MODE=false` in Render
   - Backend might be using in-memory storage

### Potential Fix:

The issue might be in the backend. Check if replies are actually being saved to the database:

```javascript
// In korus-backend/src/controllers/repliesController.ts
// Make sure replies are saved to database, not just memory
```

### Quick Fix for Testing:

1. Create a post
2. Add a reply
3. Check Render logs for any errors
4. Check if reply appears in database

## Temporary Workaround:

While we fix this, you can:
1. Use the app without closing it
2. Take screenshots while replies are visible
3. Submit to dApp Store with note about upcoming update

## Next Steps:

1. Fix icon - requires new build
2. Debug backend reply persistence
3. Consider if this is a MOCK_MODE issue

Would you like me to help debug the backend to see why replies aren't persisting?