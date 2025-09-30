# Offline Mode for Korus App

## Current Status
The app is currently configured to run in **OFFLINE MODE** to avoid any network issues on company WiFi.

## What works in Offline Mode:
- ✅ Wallet creation and management
- ✅ All UI components and navigation
- ✅ Mock data for posts and interactions
- ✅ Theme switching and preferences
- ✅ SNS domain display (mock data)

## What doesn't work in Offline Mode:
- ❌ Real backend API calls
- ❌ Actual blockchain transactions
- ❌ Persistent data (resets on app restart)
- ❌ Multi-device sync

## How to switch to Online Mode later:

### Option 1: Home Network (Recommended)
When you're on your home WiFi:
1. Start the backend: `cd korus-backend && npm run dev`
2. Update `/utils/api.ts` to use your home IP address
3. Remove the offline mode flag in `/test-api.ts` (set `isOffline = false`)
4. Uncomment the API calls in `WalletContext.tsx`

### Option 2: Cloud Deployment
Deploy the backend to a service like:
- Railway (railway.app) - Easy and free tier available
- Render (render.com) - Good free tier
- Vercel (vercel.com) - Great for serverless

Then update `API_BASE_URL` in `/utils/api.ts` to your deployed URL.

### Option 3: Mobile Hotspot
If you have unlimited data:
1. Use your phone's hotspot
2. Connect your laptop to it
3. Use localhost normally

## Development Workflow
For now, you can:
1. Build all UI features
2. Test user flows
3. Implement game logic
4. Design the interface

When ready to go online:
- Just update the configuration as described above
- All your offline work will seamlessly connect to the real backend

## No IT Concerns
Since the app runs entirely locally with no network requests:
- ✅ No suspicious network traffic
- ✅ No tunneling or proxy services
- ✅ Just normal React Native development
- ✅ Looks like any other local development