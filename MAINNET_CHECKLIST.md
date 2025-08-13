# Korus Mainnet Launch Checklist

## 🔴 Critical - Must Fix Before Launch

### 1. **Solana Network Configuration**
- [ ] Update `walletConnectors.ts` line 78: Change from `'solana:devnet'` to `'solana:mainnet-beta'`
- [ ] Update all RPC endpoints to mainnet RPC
- [ ] Remove any devnet-specific code

### 2. **Remove Demo/Test Content**
- [ ] Remove sample games in `GameContext.tsx` (lines 14-77)
- [ ] Remove sample games in `GamesView.tsx` (lines 35-104)
- [ ] Remove mock post generation in `game/[id].tsx` (lines 42-63)
- [ ] Remove `DemoInstructions` component from home screen
- [ ] Set `HACKATHON_MODE = false` in `api.ts` (already done ✓)

### 3. **Environment Variables**
- [ ] Create `.env` file with production values:
  ```
  EXPO_PUBLIC_API_URL=https://korus-backend.onrender.com/api
  EXPO_PUBLIC_HELIUS_API_KEY=<your-mainnet-helius-key>
  EXPO_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com
  ```

### 4. **Backend Configuration**
- [ ] Ensure backend is using mainnet RPC
- [ ] Update JWT token expiry for production (currently 7 days)
- [ ] Set proper CORS origins (not wildcards)
- [ ] Enable rate limiting
- [ ] Set up proper logging and monitoring

### 5. **Security & Compliance**
- [ ] Add age gate for games (18+ due to wagering)
- [ ] Add terms of service acceptance
- [ ] Add wagering disclaimers
- [ ] Implement proper error messages (no stack traces)
- [ ] Remove all console.log/logger statements in production

### 6. **App Store Requirements**
- [ ] Update app.json with production values
- [ ] Add privacy policy URL
- [ ] Add terms of service URL
- [ ] Ensure all permissions have usage descriptions
- [ ] Add app store screenshots and descriptions

## 🟡 Important - Should Fix

### 1. **Error Handling**
- [ ] Add fallback UI for network errors
- [ ] Handle wallet connection failures gracefully
- [ ] Add retry mechanisms for failed transactions
- [ ] Show user-friendly error messages

### 2. **Performance**
- [ ] Implement pagination for posts/games
- [ ] Add caching for NFT metadata
- [ ] Optimize image loading
- [ ] Add loading states for all async operations

### 3. **Token/Game Configuration**
- [ ] Define ALLY token contract address
- [ ] Set minimum/maximum wager amounts
- [ ] Add game timeout handling
- [ ] Implement proper game state persistence

## 🟢 Nice to Have

### 1. **Analytics**
- [ ] Add analytics tracking
- [ ] Implement crash reporting (Sentry)
- [ ] Add user behavior tracking

### 2. **Features**
- [ ] Add push notification support
- [ ] Implement deep linking
- [ ] Add share functionality
- [ ] Add user blocking/reporting

## 📝 Pre-Launch Testing

1. **Wallet Testing**
   - [ ] Test with real mainnet wallets
   - [ ] Test transaction signing
   - [ ] Test disconnection/reconnection
   - [ ] Test with multiple wallet providers

2. **Game Testing**
   - [ ] Test all game types with real ALLY
   - [ ] Test game timeouts
   - [ ] Test network disconnection during games
   - [ ] Test concurrent games

3. **Content Testing**
   - [ ] Test post creation with media
   - [ ] Test tipping with real tokens
   - [ ] Test reply threading
   - [ ] Test search functionality

4. **Edge Cases**
   - [ ] Test with slow network
   - [ ] Test with no network
   - [ ] Test with expired JWT
   - [ ] Test with insufficient balance

## 🚀 Launch Steps

1. **Backend Deployment**
   ```bash
   # Update environment variables on Render
   # Deploy latest backend code
   # Run database migrations
   # Test health endpoint
   ```

2. **Frontend Build**
   ```bash
   # Build for production
   eas build --platform all --profile production
   
   # Submit to stores
   eas submit --platform ios
   eas submit --platform android
   ```

3. **Post-Launch Monitoring**
   - Monitor error logs
   - Track user signups
   - Monitor transaction volume
   - Check server performance

## ⚠️ Current Issues to Address

1. **Line 78 in walletConnectors.ts**: Currently set to `'solana:devnet'`
2. **Sample games in GameContext**: Remove or conditionally load
3. **Demo instructions**: Still showing on home screen
4. **No rate limiting**: Backend vulnerable to spam
5. **No age verification**: Required for wagering apps

## 📱 App Store Specific

### Apple App Store
- Requires detailed review of crypto functionality
- May need to disable wagering in certain regions
- Need clear disclaimers about financial risks

### Google Play Store
- More crypto-friendly but still needs disclaimers
- Requires clear age rating (18+)
- Need gambling/wagering category selection