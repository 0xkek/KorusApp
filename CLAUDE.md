# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (React Native/Expo)
```bash
# Start development server
npm start

# Platform-specific development
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run web      # Web browser

# Linting
npm run lint
```

### Backend (Node.js/Express)
```bash
cd korus-backend

# Development with hot reload
npm run dev

# Build TypeScript
npm run build

# Production server
npm start

# Database operations
npx prisma migrate dev    # Run migrations in development
npx prisma generate       # Generate Prisma client
npx prisma studio         # Open database GUI
```

## Architecture Overview

This is a social media platform called "Korus" with blockchain integration, consisting of:

### Frontend (React Native/Expo)
- **Navigation**: File-based routing via Expo Router in `/app` directory
- **State Management**: React Context API (ThemeContext in `/context`)
- **Styling**: Tailwind CSS via NativeWind with custom Korus theme colors
- **Components**: Modular UI components in `/components`
  - Post/Reply system with modals
  - Custom alert system (KorusAlert/KorusAlertProvider)
  - Wallet integration components

### Backend (Express/Prisma)
- **API Structure**: RESTful API in `/korus-backend/src`
  - Controllers handle business logic
  - Routes define API endpoints
  - Middleware for JWT authentication
- **Database**: PostgreSQL with Prisma ORM
  - Schema defined in `/korus-backend/prisma/schema.prisma`
  - Models: User, Post, Reply, Like, Tip, Notification
- **Authentication**: Dual system
  - Traditional: JWT with bcrypt password hashing
  - Web3: Solana wallet signature verification

### Key Features
1. **Wallet Authentication**: Users can sign in with Solana wallets
2. **Content System**: Posts, replies, likes, tips (crypto)
3. **Categorization**: Posts organized by categories and subcategories
4. **Notifications**: Real-time notification system
5. **Theme Support**: Light/dark mode via ThemeContext

## Important Patterns

### API Endpoints
All backend routes follow RESTful conventions:
- `/api/auth/*` - Authentication endpoints
- `/api/posts/*` - Post CRUD operations
- `/api/replies/*` - Reply operations
- `/api/interactions/*` - Likes, tips

### Frontend Routing
Uses Expo Router file-based routing:
- `app/(tabs)/*` - Tab navigation screens
- `app/subcategory-feed.tsx` - Dynamic feed screens
- Modal components handle overlay interactions

### Type Safety
- TypeScript used throughout with strict mode
- Shared types in `/types` (frontend) and `/korus-backend/src/types` (backend)
- Prisma generates types from database schema

### Styling Conventions
- Tailwind utility classes for styling
- Custom theme colors defined in `tailwind.config.js`
- NativeWind for React Native Tailwind support
- Inter font family for typography

## Development Notes

1. **No test suite configured** - Tests need to be set up for both frontend and backend
2. **Environment variables** required for:
   - Database connection (DATABASE_URL)
   - JWT secret (JWT_SECRET)
   - API endpoints
3. **Blockchain integration** requires Solana wallet libraries
4. **Mock data** available in `/data` for development without backend
5. **Push notifications** - expo-notifications requires a development build instead of Expo Go for SDK 53+. Currently using local notifications only.
- add to memory
- # Error Type
Console WalletSignMessageError

## Error Message
%cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: false, hasPublicKey: false, publicKey: undefined}
logger.ts:11 ⚠️ Auth conditions not met
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: false, isAuthenticated: false, isAuthenticating: false, tokenLength: 0}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: false, hasPublicKey: false, publicKey: undefined}
logger.ts:11 ⚠️ Auth conditions not met
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: false, isAuthenticated: false, isAuthenticating: false, tokenLength: 0}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: false, hasPublicKey: false, publicKey: undefined}
logger.ts:11 ⚠️ Auth conditions not met
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: false, isAuthenticated: false, isAuthenticating: false, tokenLength: 0}
logger.ts:11 📈 Event: page_view {page_path: '/'}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: false}
logger.ts:11 🔓 No stored token found, triggering authentication...
logger.ts:11 🔐 Starting wallet authentication...
logger.ts:11 📝 Requesting signature from wallet...
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: false}
logger.ts:11 🔓 No stored token found, triggering authentication...
logger.ts:11 🔐 Starting wallet authentication...
logger.ts:11 📝 Requesting signature from wallet...
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: false}
logger.ts:11 🔓 No stored token found, triggering authentication...
logger.ts:11 🔐 Starting wallet authentication...
logger.ts:11 📝 Requesting signature from wallet...
logger.ts:11 📊 Web Vital: {name: 'FCP', value: 540, rating: 'good'}
logger.ts:11 📊 Web Vital: {name: 'TTFB', value: 126, rating: 'good'}
logger.ts:11 Shoutout queue data: {active: null, queued: Array(0), queueLength: 0}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: false}
logger.ts:11 🔓 No stored token found, triggering authentication...
logger.ts:11 🔐 Starting wallet authentication...
logger.ts:11 📝 Requesting signature from wallet...
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: false, isAuthenticated: false, isAuthenticating: false, tokenLength: 0}
logger.ts:11 📈 Event: page_view {page_path: '/welcome'}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: false}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: false, isAuthenticated: false, isAuthenticating: false, tokenLength: 0}
logger.ts:11 ✅ Signature received, verifying with backend...
logger.ts:11 ✅ Authentication successful!
logger.ts:11 ✅ Auth state updated in Zustand store
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 📈 Event: page_view {page_path: '/'}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 Shoutout queue data: {active: null, queued: Array(0), queueLength: 0}
logger.ts:11 Shoutout queue data: {active: null, queued: Array(0), queueLength: 0}
logger.ts:11 User interactions loaded: {cmgxvkp7s000bn7axupd20fo2: {…}, cmgxvk3oe0001n7ax7geweyg1: {…}, cmgwh7v1v000fn7w1dgilo0xr: {…}, cmgwh7umf000bn7w1k0ohdjvb: {…}, cmgwh7mz60007n7w1whl0gwss: {…}, …}
injected.js:1 Image with src "https://res.cloudinary.com/dldke4tjm/image/upload/v1760642376/korus-posts/ymmzst7m7qeze02zjuiq.jpg" has either width or height modified, but not the other. If you use CSS to change the size of your image, also include the styles 'width: "auto"' or 'height: "auto"' to maintain the aspect ratio.
console.warn @ injected.js:1
warnOnce @ warn-once.js:16
eval @ image-component.js:111
Promise.then
handleLoading @ image-component.js:36
onLoad @ image-component.js:191
executeDispatch @ react-dom-client.development.js:16971
runWithFiberInDEV @ react-dom-client.development.js:872
processDispatchQueue @ react-dom-client.development.js:17021
eval @ react-dom-client.development.js:17622
batchedUpdates$1 @ react-dom-client.development.js:3312
dispatchEventForPluginEventSystem @ react-dom-client.development.js:17175
dispatchEvent @ react-dom-client.development.js:21358
<img>
exports.jsx @ react-jsx-runtime.development.js:323
eval @ image-component.js:166
react_stack_bottom_frame @ react-dom-client.development.js:23584
renderWithHooksAgain @ react-dom-client.development.js:6893
renderWithHooks @ react-dom-client.development.js:6805
updateForwardRef @ react-dom-client.development.js:8807
beginWork @ react-dom-client.development.js:11197
runWithFiberInDEV @ react-dom-client.development.js:872
performUnitOfWork @ react-dom-client.development.js:15727
workLoopSync @ react-dom-client.development.js:15547
renderRootSync @ react-dom-client.development.js:15527
performWorkOnRoot @ react-dom-client.development.js:14991
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16816
performWorkUntilDeadline @ scheduler.development.js:45
<ForwardRef>
exports.jsx @ react-jsx-runtime.development.js:323
eval @ image-component.js:280
react_stack_bottom_frame @ react-dom-client.development.js:23584
renderWithHooksAgain @ react-dom-client.development.js:6893
renderWithHooks @ react-dom-client.development.js:6805
updateForwardRef @ react-dom-client.development.js:8807
beginWork @ react-dom-client.development.js:11197
runWithFiberInDEV @ react-dom-client.development.js:872
performUnitOfWork @ react-dom-client.development.js:15727
workLoopSync @ react-dom-client.development.js:15547
renderRootSync @ react-dom-client.development.js:15527
performWorkOnRoot @ react-dom-client.development.js:14991
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16816
performWorkUntilDeadline @ scheduler.development.js:45
<ForwardRef>
exports.jsxDEV @ react-jsx-dev-runtime.development.js:323
eval @ page.tsx:1071
Home @ page.tsx:896
react_stack_bottom_frame @ react-dom-client.development.js:23584
renderWithHooksAgain @ react-dom-client.development.js:6893
renderWithHooks @ react-dom-client.development.js:6805
updateFunctionComponent @ react-dom-client.development.js:9247
beginWork @ react-dom-client.development.js:10858
runWithFiberInDEV @ react-dom-client.development.js:872
performUnitOfWork @ react-dom-client.development.js:15727
workLoopSync @ react-dom-client.development.js:15547
renderRootSync @ react-dom-client.development.js:15527
performWorkOnRoot @ react-dom-client.development.js:14991
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16816
performWorkUntilDeadline @ scheduler.development.js:45
<Home>
exports.jsx @ react-jsx-runtime.development.js:323
ClientPageRoot @ client-page.js:20
react_stack_bottom_frame @ react-dom-client.development.js:23584
renderWithHooksAgain @ react-dom-client.development.js:6893
renderWithHooks @ react-dom-client.development.js:6805
updateFunctionComponent @ react-dom-client.development.js:9247
beginWork @ react-dom-client.development.js:10807
runWithFiberInDEV @ react-dom-client.development.js:872
performUnitOfWork @ react-dom-client.development.js:15727
workLoopConcurrentByScheduler @ react-dom-client.development.js:15721
renderRootConcurrent @ react-dom-client.development.js:15696
performWorkOnRoot @ react-dom-client.development.js:14990
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16816
performWorkUntilDeadline @ scheduler.development.js:45
"use client"
initializeElement @ react-server-dom-webpack-client.browser.development.js:1343
eval @ react-server-dom-webpack-client.browser.development.js:3066
initializeModelChunk @ react-server-dom-webpack-client.browser.development.js:1246
resolveModelChunk @ react-server-dom-webpack-client.browser.development.js:1101
processFullStringRow @ react-server-dom-webpack-client.browser.development.js:2899
processFullBinaryRow @ react-server-dom-webpack-client.browser.development.js:2766
processBinaryChunk @ react-server-dom-webpack-client.browser.development.js:2969
progress @ react-server-dom-webpack-client.browser.development.js:3233
"use server"
ResponseInstance @ react-server-dom-webpack-client.browser.development.js:2041
createResponseFromOptions @ react-server-dom-webpack-client.browser.development.js:3094
exports.createFromReadableStream @ react-server-dom-webpack-client.browser.development.js:3478
createFromNextReadableStream @ fetch-server-response.js:209
fetchServerResponse @ fetch-server-response.js:116
await in fetchServerResponse
eval @ prefetch-cache-utils.js:197
task @ promise-queue.js:30
processNext @ promise-queue.js:81
enqueue @ promise-queue.js:45
createLazyPrefetchEntry @ prefetch-cache-utils.js:197
getOrCreatePrefetchCacheEntry @ prefetch-cache-utils.js:144
navigateReducer @ navigate-reducer.js:166
clientReducer @ router-reducer.js:25
action @ app-router-instance.js:156
runAction @ app-router-instance.js:66
dispatchAction @ app-router-instance.js:120
dispatch @ app-router-instance.js:154
eval @ use-action-queue.js:55
startTransition @ react-dom-client.development.js:7968
dispatch @ use-action-queue.js:54
dispatchAppRouterAction @ use-action-queue.js:37
dispatchNavigateAction @ app-router-instance.js:207
eval @ app-router-instance.js:260
exports.startTransition @ react.development.js:1150
push @ app-router-instance.js:258
WelcomePage.useEffect @ page.tsx:59
react_stack_bottom_frame @ react-dom-client.development.js:23669
runWithFiberInDEV @ react-dom-client.development.js:872
commitHookEffectListMount @ react-dom-client.development.js:12345
commitHookPassiveMountEffects @ react-dom-client.development.js:12466
commitPassiveMountOnFiber @ react-dom-client.development.js:14387
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14390
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14390
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14390
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14390
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14390
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14390
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14390
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14390
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14390
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14390
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14399
flushPassiveEffects @ react-dom-client.development.js:16338
flushPendingEffects @ react-dom-client.development.js:16299
flushSpawnedWork @ react-dom-client.development.js:16265
commitRoot @ react-dom-client.development.js:15998
commitRootWhenReady @ react-dom-client.development.js:15228
performWorkOnRoot @ react-dom-client.development.js:15147
performSyncWorkOnRoot @ react-dom-client.development.js:16831Understand this warning
logger.ts:11 User interactions loaded: {cmgxvkp7s000bn7axupd20fo2: {…}, cmgxvk3oe0001n7ax7geweyg1: {…}, cmgwh7v1v000fn7w1dgilo0xr: {…}, cmgwh7umf000bn7w1k0ohdjvb: {…}, cmgwh7mz60007n7w1whl0gwss: {…}, …}
injected.js:1 Image with src "https://res.cloudinary.com/dldke4tjm/image/upload/v1760803964/korus-posts/ipgu9evnjcxhwrg9etxi.png" was detected as the Largest Contentful Paint (LCP). Please add the "priority" property if this image is above the fold.
Read more: https://nextjs.org/docs/api-reference/next/image#priority
console.warn @ injected.js:1
warnOnce @ warn-once.js:16
eval @ get-img-props.js:449Understand this warning
logger.ts:11 ✅ Signature received, verifying with backend...
logger.ts:11 ✅ Authentication successful!
logger.ts:11 ✅ Auth state updated in Zustand store
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 User interactions loaded: {cmgxvkp7s000bn7axupd20fo2: {…}, cmgxvk3oe0001n7ax7geweyg1: {…}, cmgwh7v1v000fn7w1dgilo0xr: {…}, cmgwh7umf000bn7w1k0ohdjvb: {…}, cmgwh7mz60007n7w1whl0gwss: {…}, …}
logger.ts:11 ✅ Signature received, verifying with backend...
logger.ts:11 ✅ Authentication successful!
logger.ts:11 ✅ Auth state updated in Zustand store
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 User interactions loaded: {cmgxvkp7s000bn7axupd20fo2: {…}, cmgxvk3oe0001n7ax7geweyg1: {…}, cmgwh7v1v000fn7w1dgilo0xr: {…}, cmgwh7umf000bn7w1k0ohdjvb: {…}, cmgwh7mz60007n7w1whl0gwss: {…}, …}
logger.ts:11 ✅ Signature received, verifying with backend...
logger.ts:11 ✅ Authentication successful!
logger.ts:11 ✅ Auth state updated in Zustand store
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 User interactions loaded: {cmgxvkp7s000bn7axupd20fo2: {…}, cmgxvk3oe0001n7ax7geweyg1: {…}, cmgwh7v1v000fn7w1dgilo0xr: {…}, cmgwh7umf000bn7w1k0ohdjvb: {…}, cmgwh7mz60007n7w1whl0gwss: {…}, …}
logger.ts:11 Window focused, refetching posts...
logger.ts:11 Shoutout queue data: {active: null, queued: Array(0), queueLength: 0}
logger.ts:11 User interactions loaded: {cmgxvkp7s000bn7axupd20fo2: {…}, cmgxvk3oe0001n7ax7geweyg1: {…}, cmgwh7v1v000fn7w1dgilo0xr: {…}, cmgwh7umf000bn7w1k0ohdjvb: {…}, cmgwh7mz60007n7w1whl0gwss: {…}, …}%cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: false, hasPublicKey: false, publicKey: undefined}
logger.ts:11 ⚠️ Auth conditions not met
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: false, isAuthenticated: false, isAuthenticating: false, tokenLength: 0}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: false, hasPublicKey: false, publicKey: undefined}
logger.ts:11 ⚠️ Auth conditions not met
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: false, isAuthenticated: false, isAuthenticating: false, tokenLength: 0}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: false, hasPublicKey: false, publicKey: undefined}
logger.ts:11 ⚠️ Auth conditions not met
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: false, isAuthenticated: false, isAuthenticating: false, tokenLength: 0}
logger.ts:11 📈 Event: page_view {page_path: '/'}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: false}
logger.ts:11 🔓 No stored token found, triggering authentication...
logger.ts:11 🔐 Starting wallet authentication...
logger.ts:11 📝 Requesting signature from wallet...
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: false}
logger.ts:11 🔓 No stored token found, triggering authentication...
logger.ts:11 🔐 Starting wallet authentication...
logger.ts:11 📝 Requesting signature from wallet...
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: false}
logger.ts:11 🔓 No stored token found, triggering authentication...
logger.ts:11 🔐 Starting wallet authentication...
logger.ts:11 📝 Requesting signature from wallet...
logger.ts:11 📊 Web Vital: {name: 'FCP', value: 540, rating: 'good'}
logger.ts:11 📊 Web Vital: {name: 'TTFB', value: 126, rating: 'good'}
logger.ts:11 Shoutout queue data: {active: null, queued: Array(0), queueLength: 0}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: false}
logger.ts:11 🔓 No stored token found, triggering authentication...
logger.ts:11 🔐 Starting wallet authentication...
logger.ts:11 📝 Requesting signature from wallet...
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: false, isAuthenticated: false, isAuthenticating: false, tokenLength: 0}
logger.ts:11 📈 Event: page_view {page_path: '/welcome'}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: false}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: false, isAuthenticated: false, isAuthenticating: false, tokenLength: 0}
logger.ts:11 ✅ Signature received, verifying with backend...
logger.ts:11 ✅ Authentication successful!
logger.ts:11 ✅ Auth state updated in Zustand store
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 📈 Event: page_view {page_path: '/'}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 Shoutout queue data: {active: null, queued: Array(0), queueLength: 0}
logger.ts:11 Shoutout queue data: {active: null, queued: Array(0), queueLength: 0}
logger.ts:11 User interactions loaded: {cmgxvkp7s000bn7axupd20fo2: {…}, cmgxvk3oe0001n7ax7geweyg1: {…}, cmgwh7v1v000fn7w1dgilo0xr: {…}, cmgwh7umf000bn7w1k0ohdjvb: {…}, cmgwh7mz60007n7w1whl0gwss: {…}, …}
injected.js:1 Image with src "https://res.cloudinary.com/dldke4tjm/image/upload/v1760642376/korus-posts/ymmzst7m7qeze02zjuiq.jpg" has either width or height modified, but not the other. If you use CSS to change the size of your image, also include the styles 'width: "auto"' or 'height: "auto"' to maintain the aspect ratio.
console.warn @ injected.js:1
warnOnce @ warn-once.js:16
eval @ image-component.js:111
Promise.then
handleLoading @ image-component.js:36
onLoad @ image-component.js:191
executeDispatch @ react-dom-client.development.js:16971
runWithFiberInDEV @ react-dom-client.development.js:872
processDispatchQueue @ react-dom-client.development.js:17021
eval @ react-dom-client.development.js:17622
batchedUpdates$1 @ react-dom-client.development.js:3312
dispatchEventForPluginEventSystem @ react-dom-client.development.js:17175
dispatchEvent @ react-dom-client.development.js:21358
<img>
exports.jsx @ react-jsx-runtime.development.js:323
eval @ image-component.js:166
react_stack_bottom_frame @ react-dom-client.development.js:23584
renderWithHooksAgain @ react-dom-client.development.js:6893
renderWithHooks @ react-dom-client.development.js:6805
updateForwardRef @ react-dom-client.development.js:8807
beginWork @ react-dom-client.development.js:11197
runWithFiberInDEV @ react-dom-client.development.js:872
performUnitOfWork @ react-dom-client.development.js:15727
workLoopSync @ react-dom-client.development.js:15547
renderRootSync @ react-dom-client.development.js:15527
performWorkOnRoot @ react-dom-client.development.js:14991
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16816
performWorkUntilDeadline @ scheduler.development.js:45
<ForwardRef>
exports.jsx @ react-jsx-runtime.development.js:323
eval @ image-component.js:280
react_stack_bottom_frame @ react-dom-client.development.js:23584
renderWithHooksAgain @ react-dom-client.development.js:6893
renderWithHooks @ react-dom-client.development.js:6805
updateForwardRef @ react-dom-client.development.js:8807
beginWork @ react-dom-client.development.js:11197
runWithFiberInDEV @ react-dom-client.development.js:872
performUnitOfWork @ react-dom-client.development.js:15727
workLoopSync @ react-dom-client.development.js:15547
renderRootSync @ react-dom-client.development.js:15527
performWorkOnRoot @ react-dom-client.development.js:14991
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16816
performWorkUntilDeadline @ scheduler.development.js:45
<ForwardRef>
exports.jsxDEV @ react-jsx-dev-runtime.development.js:323
eval @ page.tsx:1071
Home @ page.tsx:896
react_stack_bottom_frame @ react-dom-client.development.js:23584
renderWithHooksAgain @ react-dom-client.development.js:6893
renderWithHooks @ react-dom-client.development.js:6805
updateFunctionComponent @ react-dom-client.development.js:9247
beginWork @ react-dom-client.development.js:10858
runWithFiberInDEV @ react-dom-client.development.js:872
performUnitOfWork @ react-dom-client.development.js:15727
workLoopSync @ react-dom-client.development.js:15547
renderRootSync @ react-dom-client.development.js:15527
performWorkOnRoot @ react-dom-client.development.js:14991
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16816
performWorkUntilDeadline @ scheduler.development.js:45
<Home>
exports.jsx @ react-jsx-runtime.development.js:323
ClientPageRoot @ client-page.js:20
react_stack_bottom_frame @ react-dom-client.development.js:23584
renderWithHooksAgain @ react-dom-client.development.js:6893
renderWithHooks @ react-dom-client.development.js:6805
updateFunctionComponent @ react-dom-client.development.js:9247
beginWork @ react-dom-client.development.js:10807
runWithFiberInDEV @ react-dom-client.development.js:872
performUnitOfWork @ react-dom-client.development.js:15727
workLoopConcurrentByScheduler @ react-dom-client.development.js:15721
renderRootConcurrent @ react-dom-client.development.js:15696
performWorkOnRoot @ react-dom-client.development.js:14990
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16816
performWorkUntilDeadline @ scheduler.development.js:45
"use client"
initializeElement @ react-server-dom-webpack-client.browser.development.js:1343
eval @ react-server-dom-webpack-client.browser.development.js:3066
initializeModelChunk @ react-server-dom-webpack-client.browser.development.js:1246
resolveModelChunk @ react-server-dom-webpack-client.browser.development.js:1101
processFullStringRow @ react-server-dom-webpack-client.browser.development.js:2899
processFullBinaryRow @ react-server-dom-webpack-client.browser.development.js:2766
processBinaryChunk @ react-server-dom-webpack-client.browser.development.js:2969
progress @ react-server-dom-webpack-client.browser.development.js:3233
"use server"
ResponseInstance @ react-server-dom-webpack-client.browser.development.js:2041
createResponseFromOptions @ react-server-dom-webpack-client.browser.development.js:3094
exports.createFromReadableStream @ react-server-dom-webpack-client.browser.development.js:3478
createFromNextReadableStream @ fetch-server-response.js:209
fetchServerResponse @ fetch-server-response.js:116
await in fetchServerResponse
eval @ prefetch-cache-utils.js:197
task @ promise-queue.js:30
processNext @ promise-queue.js:81
enqueue @ promise-queue.js:45
createLazyPrefetchEntry @ prefetch-cache-utils.js:197
getOrCreatePrefetchCacheEntry @ prefetch-cache-utils.js:144
navigateReducer @ navigate-reducer.js:166
clientReducer @ router-reducer.js:25
action @ app-router-instance.js:156
runAction @ app-router-instance.js:66
dispatchAction @ app-router-instance.js:120
dispatch @ app-router-instance.js:154
eval @ use-action-queue.js:55
startTransition @ react-dom-client.development.js:7968
dispatch @ use-action-queue.js:54
dispatchAppRouterAction @ use-action-queue.js:37
dispatchNavigateAction @ app-router-instance.js:207
eval @ app-router-instance.js:260
exports.startTransition @ react.development.js:1150
push @ app-router-instance.js:258
WelcomePage.useEffect @ page.tsx:59
react_stack_bottom_frame @ react-dom-client.development.js:23669
runWithFiberInDEV @ react-dom-client.development.js:872
commitHookEffectListMount @ react-dom-client.development.js:12345
commitHookPassiveMountEffects @ react-dom-client.development.js:12466
commitPassiveMountOnFiber @ react-dom-client.development.js:14387
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14390
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14390
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14390
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14390
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14390
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14390
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14390
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14390
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14390
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14390
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14380
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14514
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14360
commitPassiveMountOnFiber @ react-dom-client.development.js:14399
flushPassiveEffects @ react-dom-client.development.js:16338
flushPendingEffects @ react-dom-client.development.js:16299
flushSpawnedWork @ react-dom-client.development.js:16265
commitRoot @ react-dom-client.development.js:15998
commitRootWhenReady @ react-dom-client.development.js:15228
performWorkOnRoot @ react-dom-client.development.js:15147
performSyncWorkOnRoot @ react-dom-client.development.js:16831Understand this warning
logger.ts:11 User interactions loaded: {cmgxvkp7s000bn7axupd20fo2: {…}, cmgxvk3oe0001n7ax7geweyg1: {…}, cmgwh7v1v000fn7w1dgilo0xr: {…}, cmgwh7umf000bn7w1k0ohdjvb: {…}, cmgwh7mz60007n7w1whl0gwss: {…}, …}
injected.js:1 Image with src "https://res.cloudinary.com/dldke4tjm/image/upload/v1760803964/korus-posts/ipgu9evnjcxhwrg9etxi.png" was detected as the Largest Contentful Paint (LCP). Please add the "priority" property if this image is above the fold.
Read more: https://nextjs.org/docs/api-reference/next/image#priority
console.warn @ injected.js:1
warnOnce @ warn-once.js:16
eval @ get-img-props.js:449Understand this warning
logger.ts:11 ✅ Signature received, verifying with backend...
logger.ts:11 ✅ Authentication successful!
logger.ts:11 ✅ Auth state updated in Zustand store
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 User interactions loaded: {cmgxvkp7s000bn7axupd20fo2: {…}, cmgxvk3oe0001n7ax7geweyg1: {…}, cmgwh7v1v000fn7w1dgilo0xr: {…}, cmgwh7umf000bn7w1k0ohdjvb: {…}, cmgwh7mz60007n7w1whl0gwss: {…}, …}
logger.ts:11 ✅ Signature received, verifying with backend...
logger.ts:11 ✅ Authentication successful!
logger.ts:11 ✅ Auth state updated in Zustand store
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 User interactions loaded: {cmgxvkp7s000bn7axupd20fo2: {…}, cmgxvk3oe0001n7ax7geweyg1: {…}, cmgwh7v1v000fn7w1dgilo0xr: {…}, cmgwh7umf000bn7w1k0ohdjvb: {…}, cmgwh7mz60007n7w1whl0gwss: {…}, …}
logger.ts:11 ✅ Signature received, verifying with backend...
logger.ts:11 ✅ Authentication successful!
logger.ts:11 ✅ Auth state updated in Zustand store
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 🔍 Auth effect running: {hasWindow: true, connected: true, hasPublicKey: true, publicKey: 'HbwpdmYvLQLgzi6adisaQJKTELtzyDtxNpnYPVsKRjPA'}
logger.ts:11 🔑 Checking for stored token: {hasToken: true}
logger.ts:11 🔐 useWalletAuth state changed: {hasToken: true, isAuthenticated: true, isAuthenticating: false, tokenLength: 212}
logger.ts:11 User interactions loaded: {cmgxvkp7s000bn7axupd20fo2: {…}, cmgxvk3oe0001n7ax7geweyg1: {…}, cmgwh7v1v000fn7w1dgilo0xr: {…}, cmgwh7umf000bn7w1k0ohdjvb: {…}, cmgwh7mz60007n7w1whl0gwss: {…}, …}
logger.ts:11 Window focused, refetching posts...
logger.ts:11 Shoutout queue data: {active: null, queued: Array(0), queueLength: 0}
logger.ts:11 User interactions loaded: {cmgxvkp7s000bn7axupd20fo2: {…}, cmgxvk3oe0001n7ax7geweyg1: {…}, cmgwh7v1v000fn7w1dgilo0xr: {…}, cmgwh7umf000bn7w1k0ohdjvb: {…}, cmgwh7mz60007n7w1whl0gwss: {…}, …}Plugin Closed


    at async useWalletAuth.useCallback[authenticate] (src/hooks/useWalletAuth.ts:63:25)

## Code Frame
  61 |       logger.log('📝 Requesting signature from wallet...');
  62 |       // Request signature from wallet
> 63 |       const signature = await signMessage(messageBytes);
     |                         ^
  64 |       const signatureBase58 = bs58.encode(signature);
  65 |
  66 |       logger.log('✅ Signature received, verifying with backend...');

Next.js version: 15.5.4 (Webpack)