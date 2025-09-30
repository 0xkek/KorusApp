# Push Notifications Setup ✅

## Implementation Complete

### Backend Changes
1. **Installed Expo Server SDK** (`expo-server-sdk`)
2. **Added database fields**:
   - `pushToken` - Stores Expo push token
   - `pushNotificationsEnabled` - User preference
3. **Created push service** (`pushNotificationService.ts`):
   - Sends push for likes, replies, tips
   - Manages invalid tokens
   - Handles bulk notifications
4. **Added endpoint** (`/api/auth/push-token`):
   - Saves user's push token

### Frontend Changes
1. **Fixed push token registration**:
   - Uses correct project ID: `6f182b5a-61e8-4be6-83a4-0accb8873ca3`
   - Sends token to backend automatically
2. **Notification handlers** configured

### How It Works
```
1. User opens app
2. App requests notification permission
3. Gets Expo push token
4. Sends token to backend via /api/auth/push-token
5. When someone likes/replies/tips:
   - Backend creates notification in DB
   - Sends push notification via Expo
   - User receives notification on device
```

## Testing Push Notifications

### Important: Push ONLY works in standalone builds!
- ❌ **Expo Go**: Push notifications disabled in SDK 53+
- ✅ **EAS Build**: Works perfectly
- ✅ **Production**: Fully functional

### To Test:
1. Build app with EAS:
   ```bash
   eas build --platform all
   ```

2. Install on device (TestFlight/APK)

3. Open app and allow notifications

4. Test by:
   - Having someone like your post
   - Getting a reply
   - Receiving a tip

## Database Migration

Run this in production before deploying:
```bash
npx prisma migrate deploy
```

Or manually execute:
```sql
ALTER TABLE "users" ADD COLUMN "pushToken" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "idx_users_push_token" ON "users"("pushToken") WHERE "pushToken" IS NOT NULL;
```

## Environment Variables

No new environment variables needed! Push notifications use existing setup.

## Notification Types

### Like Notification
- **Title**: "❤️ New Like"
- **Body**: "[User] liked your post: [content preview]"

### Reply Notification
- **Title**: "💬 New Reply"
- **Body**: "[User] replied: [reply preview]"

### Tip Notification
- **Title**: "💰 New Tip!"
- **Body**: "[User] tipped you X SOL!"

## Troubleshooting

### Push token not saving?
- Check auth token is valid
- Ensure backend is running
- Check network connectivity

### Not receiving notifications?
- Must use standalone build (not Expo Go)
- Check notification permissions
- Verify push token in database

### Build Issues?
- Current build: https://expo.dev/accounts/kingkitty/projects/KorusApp/builds/1c9926b9-4f7b-4909-8678-c4cfca981778
- Build profile: `preview`
- Platform: Android (iOS needs credentials setup)

## Production Checklist

- [x] Backend push service implemented
- [x] Database schema updated
- [x] Frontend token registration
- [x] Push sent on likes/replies/tips
- [ ] Deploy database migration
- [ ] Build production app with EAS
- [ ] Test on real devices

## Next Steps

1. **Monitor build**: Check EAS build progress
2. **Download APK**: Once built, test on Android
3. **iOS Setup**: Configure iOS credentials for TestFlight
4. **Deploy**: Push to production with migrations

Push notifications are **fully implemented** and waiting for the EAS build to complete!