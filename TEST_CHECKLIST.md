# Korus App Test Checklist

## Authentication & Onboarding
- [ ] Welcome screen loads correctly
- [ ] Can create new wallet (mock mode)
- [ ] Can import from Seed Vault (mock mode)
- [ ] Authentication persists across app restarts
- [ ] Logout functionality works
- [ ] Auth token expires gracefully

## Feed & Posts
- [ ] Feed loads with posts
- [ ] Pull-to-refresh works
- [ ] Can create new post
- [ ] Character counter works (500 max)
- [ ] Can add image to post
- [ ] Can add video to post
- [ ] Duplicate post prevention works
- [ ] Rate limiting works (1 post per 30 seconds)
- [ ] Empty feed state displays correctly
- [ ] Error state displays with retry button
- [ ] Skeleton loader shows while loading

## Interactions
- [ ] Can like/unlike posts immediately
- [ ] Like count updates optimistically
- [ ] Can like/unlike replies
- [ ] Likes persist after refresh
- [ ] Error handling for failed likes
- [ ] Can expand/collapse replies
- [ ] Reply sorting (best/recent) works

## Replies & Comments
- [ ] Can create reply to post
- [ ] Can create nested reply (reply to reply)
- [ ] Character counter works (500 max)
- [ ] Reply shows immediately after posting
- [ ] Can quote reply
- [ ] Reply validation works
- [ ] Reply submission guard prevents duplicates

## Validation & Security
- [ ] Input sanitization prevents XSS
- [ ] Post content validation works
- [ ] Reply content validation works
- [ ] Tip amount validation works
- [ ] Wallet address validation works
- [ ] Rate limiting prevents spam

## Error Handling
- [ ] Network errors show user-friendly messages
- [ ] API errors display appropriate messages
- [ ] Retry logic works for failed requests
- [ ] Error boundary catches crashes
- [ ] Form validation errors display clearly

## Performance
- [ ] Feed scrolls smoothly
- [ ] No unnecessary re-renders
- [ ] Images load efficiently
- [ ] Videos play without stuttering
- [ ] App remains responsive during API calls

## Navigation
- [ ] Tab navigation works
- [ ] Can navigate to post details
- [ ] Can navigate to user profiles
- [ ] Back navigation works correctly
- [ ] Deep linking works (if implemented)

## UI/UX
- [ ] Dark mode works correctly
- [ ] Light mode works correctly
- [ ] All gradients render properly
- [ ] Animations are smooth
- [ ] Touch feedback (haptics) works
- [ ] Loading states display correctly
- [ ] Empty states are informative

## Backend Integration
- [ ] Posts load from backend
- [ ] User interactions sync with backend
- [ ] Authentication works with backend
- [ ] WebSocket connections (if any) work
- [ ] File uploads work correctly

## Edge Cases
- [ ] Offline mode handling
- [ ] Very long post content displays correctly
- [ ] Special characters in posts work
- [ ] URLs in posts are clickable
- [ ] Emoji support works
- [ ] International characters work

## Games (if testing game features)
- [ ] Can create game post
- [ ] Can join game
- [ ] Game state updates correctly
- [ ] Game completion works
- [ ] Wager system works

## Notifications
- [ ] Local notifications work
- [ ] Push notifications (if implemented)
- [ ] Notification permissions handled

## Settings & Profile
- [ ] Settings page loads
- [ ] Can toggle dark/light mode
- [ ] Profile information displays
- [ ] Can edit profile (if implemented)

## Platform Specific
### iOS
- [ ] Runs on iOS simulator
- [ ] Safe area insets work correctly
- [ ] Keyboard handling works
- [ ] Status bar styling correct

### Android
- [ ] Runs on Android emulator
- [ ] Back button behavior correct
- [ ] Keyboard handling works
- [ ] Status bar styling correct

### Web
- [ ] Runs in web browser
- [ ] Responsive design works
- [ ] Mouse interactions work
- [ ] Keyboard shortcuts (if any) work