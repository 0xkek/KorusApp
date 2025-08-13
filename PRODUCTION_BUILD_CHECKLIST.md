# Production Build Checklist

## Pre-Build Verification

### 1. Environment Variables
Create `.env.production` file:
```env
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_API_URL=https://korus-backend.onrender.com/api
EXPO_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com
```

### 2. Verify Configuration
- [ ] Check `app.json` has correct bundle identifiers
- [ ] Verify mainnet configuration in `config/environment.ts`
- [ ] Ensure `smartContractsEnabled: false` (for initial launch)

### 3. Test Current Build Locally
```bash
# Set production environment
export EXPO_PUBLIC_ENVIRONMENT=production

# Run locally
npm start

# Test these flows:
- [ ] Wallet connection (Phantom)
- [ ] Create a post
- [ ] View notifications
- [ ] Check API calls go to production backend
```

## Build Commands

### 1. Install EAS CLI (if not installed)
```bash
npm install -g eas-cli
eas login
```

### 2. Build APK for Android
```bash
# Production APK
eas build -p android --profile production

# This will:
# - Upload your code to EAS servers
# - Build the APK
# - Provide a download link when complete
```

### 3. Build for iOS (if needed)
```bash
# Requires Apple Developer account
eas build -p ios --profile production
```

## Post-Build Steps

### 1. Download and Test APK
- [ ] Download APK from EAS dashboard
- [ ] Install on test device
- [ ] Test all critical flows
- [ ] Verify production backend connection

### 2. Prepare for Solana dApp Store

Required files:
- [ ] APK file from EAS build
- [ ] Icon (512x512 PNG)
- [ ] Screenshots (3-5)
- [ ] Description text

### 3. Submit to Solana dApp Store

1. Go to: https://publisher.solanamobile.com
2. Create new app listing
3. Upload APK
4. Fill in app details
5. Submit for review

## Build Status Monitoring

Check build status:
```bash
# View build status
eas build:list

# View specific build logs
eas build:view [BUILD_ID]
```

## Emergency Rollback

If issues found after deployment:
1. Set backend to maintenance mode
2. Deploy hotfix via EAS Update:
   ```bash
   eas update --branch production --message "Emergency fix"
   ```
3. Or build new APK with fixes

## Final Checklist Before Submission

- [ ] APK tested on multiple devices
- [ ] Wallet connections work (Phantom, Seed Vault)
- [ ] Backend API responding correctly
- [ ] No debug logs in production
- [ ] Age gate appears on first launch
- [ ] All UI/UX polished

## Support Preparation

- [ ] Support email ready
- [ ] Discord/Telegram for community
- [ ] FAQ documentation
- [ ] Known issues documented