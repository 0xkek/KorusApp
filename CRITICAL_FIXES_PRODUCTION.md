# 🚨 CRITICAL FIXES FOR PRODUCTION DEPLOYMENT
**ANDROID-ONLY BUILD - IMMEDIATE ACTION REQUIRED**
Generated: 2025-09-04

## 🔴 PRIORITY 1: SECURITY CRITICAL (MUST FIX IMMEDIATELY)

### 1. HELIUS API KEY EXPOSED
**SEVERITY: CRITICAL**
- **Issue**: Helius API key was hardcoded and exposed (now invalidated)
- **Files Affected**: 
  - `/korus-backend/.env.production` - NEEDS NEW KEY
  - `/.env.production` - NEEDS NEW KEY
- **FIX REQUIRED**:
  ```bash
  # 1. Go to https://helius.xyz
  # 2. Invalidate old key
  # 3. Generate new production key
  # 4. Update both .env.production files
  EXPO_PUBLIC_HELIUS_API_KEY=NEW_KEY_HERE
  HELIUS_API_KEY=NEW_KEY_HERE
  ```

### 2. JWT & CSRF SECRETS MISSING
**SEVERITY: CRITICAL**
- **Issue**: No secure secrets configured, app will crash
- **File**: `/korus-backend/.env.production`
- **FIX REQUIRED**:
  ```bash
  # Generate 64-character random strings:
  JWT_SECRET=$(openssl rand -hex 32)
  CSRF_SECRET=$(openssl rand -hex 32)
  ```

### 3. PLATFORM WALLET KEYS MISSING
**SEVERITY: CRITICAL**
- **Issue**: Token distribution will fail without platform wallet
- **File**: `/korus-backend/.env.production`
- **FIX REQUIRED**:
  ```bash
  PLATFORM_WALLET_ADDRESS=YOUR_WALLET_PUBLIC_KEY
  PLATFORM_PRIVATE_KEY=YOUR_WALLET_PRIVATE_KEY  # KEEP EXTREMELY SECURE
  PLATFORM_PUBLIC_KEY=YOUR_WALLET_PUBLIC_KEY
  TEAM_WALLET_ADDRESS=YOUR_TEAM_WALLET
  ```

## 🟠 PRIORITY 2: FUNCTIONALITY BREAKING (FIX BEFORE LAUNCH)

### 4. DATABASE URL NOT CONFIGURED
**SEVERITY: HIGH**
- **Issue**: Using local dev database, not production
- **File**: `/korus-backend/.env.production`
- **FIX REQUIRED**:
  ```bash
  # Option 1: Railway PostgreSQL
  DATABASE_URL=postgresql://postgres:PASSWORD@HOST.railway.app:PORT/railway
  
  # Option 2: Supabase
  DATABASE_URL=postgresql://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres
  ```

### 5. ALLY TOKEN NOT DEPLOYED
**SEVERITY: HIGH**
- **Issue**: Token mint address missing, tips/rewards will fail
- **Files**: Both `.env.production` files
- **FIX REQUIRED**:
  ```bash
  # Deploy ALLY token to Solana mainnet first, then:
  EXPO_PUBLIC_ALLY_TOKEN_ADDRESS=YOUR_MINT_ADDRESS
  ALLY_TOKEN_MINT=YOUR_MINT_ADDRESS
  GENESIS_TOKEN_MINT=YOUR_MINT_ADDRESS
  ```

### 6. CLOUDINARY NOT CONFIGURED
**SEVERITY: HIGH**
- **Issue**: Image/video uploads will fail
- **File**: `/.env.production`
- **FIX REQUIRED**:
  ```bash
  # Get from https://cloudinary.com/console
  EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
  EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=YOUR_PRESET
  ```

## 🟡 PRIORITY 3: PRODUCTION OPTIMIZATION (FIX BEFORE MARKETING)

### 7. SENTRY ERROR TRACKING
**SEVERITY: MEDIUM**
- **Issue**: No error monitoring in production
- **File**: `/.env.production`
- **FIX REQUIRED**:
  ```bash
  # Get from https://sentry.io
  EXPO_PUBLIC_SENTRY_DSN=YOUR_SENTRY_DSN
  ```

### 8. EXPO PUSH NOTIFICATIONS
**SEVERITY: MEDIUM**
- **Issue**: Push notifications won't work
- **File**: `/korus-backend/.env.production`
- **FIX REQUIRED**:
  ```bash
  # Get from Expo dashboard
  EXPO_ACCESS_TOKEN=YOUR_EXPO_ACCESS_TOKEN
  ```

### 9. SOLANA RPC ENDPOINTS
**SEVERITY: MEDIUM**
- **Issue**: Using public RPC (rate limited)
- **FIX REQUIRED**:
  ```bash
  # Get dedicated RPC from Helius/QuickNode/Alchemy
  EXPO_PUBLIC_SOLANA_RPC=https://YOUR-DEDICATED-RPC.com
  SOLANA_RPC_URL=https://YOUR-DEDICATED-RPC.com
  ```

## 🟢 PRIORITY 4: PRE-DEPLOYMENT CHECKLIST

### 10. RENDER ENVIRONMENT VARIABLES
**ACTION REQUIRED**:
1. Go to Render Dashboard
2. Add ALL environment variables from `/korus-backend/.env.production`
3. Verify deployment succeeds

### 11. DATABASE MIGRATIONS
**ACTION REQUIRED**:
```bash
# On production database:
npx prisma migrate deploy
```

### 12. ANDROID BUILD
**ACTION REQUIRED**:
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build production APK
eas build --platform android --profile production
```

## ⚠️ VERIFICATION COMMANDS

```bash
# 1. Test backend locally with production config
cd korus-backend
NODE_ENV=production npm start

# 2. Test frontend with production backend
cd ..
EXPO_PUBLIC_ENVIRONMENT=production npx expo start

# 3. Verify all environment variables
node -e "require('dotenv').config({path:'.env.production'}); Object.keys(process.env).filter(k=>k.includes('EXPO')||k.includes('JWT')||k.includes('DATABASE')).forEach(k=>console.log(k+':'+(process.env[k]?'SET':'MISSING')))"
```

## 📋 FINAL LAUNCH CHECKLIST

- [ ] Helius API key replaced
- [ ] JWT/CSRF secrets generated (64 chars minimum)
- [ ] Platform wallet configured
- [ ] Production database URL set
- [ ] ALLY token deployed to mainnet
- [ ] ALLY token mint address configured
- [ ] Cloudinary account configured
- [ ] Sentry DSN configured
- [ ] Expo push token configured
- [ ] Dedicated Solana RPC obtained
- [ ] All Render environment variables set
- [ ] Database migrations deployed
- [ ] Android APK built with EAS
- [ ] Production API tested
- [ ] Android app tested with production API

## 🚫 DO NOT LAUNCH UNTIL ALL PRIORITY 1 & 2 ITEMS ARE COMPLETE

**ESTIMATED TIME TO FIX ALL CRITICAL ISSUES: 2-4 HOURS**

---
**WARNING**: Launching without fixing Priority 1 issues will result in:
- Immediate security breach
- Complete app failure
- Token loss/theft
- User data exposure