# Korus Mainnet Deployment - Current Status

**Date**: September 30, 2025
**Status**: Pre-deployment checks complete
**Next Action**: Production environment setup required

---

## ✅ Completed Checks

### 1. Authority Keypair Backup ✅
- **Original**: `/Users/maxattard/KorusApp/authority-keypair.json`
- **Backup**: `~/Desktop/korus-authority-BACKUP-[timestamp].json`
- **Public Key**: `G4WAtEdLYWpDoxNWKVbd2Pv9LoX2feFSxN7mWUXt3kGG`
- **Status**: ✅ Backed up successfully

### 2. Treasury Wallet Check ⚠️
- **Address**: `7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY`
- **Balance (Devnet)**: 0 SOL
- **Status**: ⚠️ This is currently a devnet-only wallet
- **Action Required**: Verify this address for mainnet or provide new treasury address

### 3. Backend Health Check ✅
- **URL**: `https://korus-backend.onrender.com`
- **Status**: ✅ Running and healthy
- **Response**: `{"status":"OK","message":"Korus Backend is running!"}`
- **API Test**: ✅ Endpoints responding

### 4. JWT Secret Generated ✅
- **Status**: ✅ Secure 512-bit secret generated
- **Location**: `/tmp/korus-jwt-secret.txt`
- **Usage**: Add to production backend .env

---

## ⚠️ Production Environment Issues Found

### Issue 1: Local Development Database
**Current**: `postgresql://postgres:password@localhost:5432/korus_dev`
**Problem**: Backend .env points to local database
**Impact**: This won't work on production Render deployment
**Solution Required**: Set up production PostgreSQL database

### Issue 2: Development Mode Active
**Current**: `NODE_ENV=development`
**Problem**: Backend running in dev mode
**Impact**: Not production-optimized, security features disabled
**Solution Required**: Change to `NODE_ENV=production`

### Issue 3: Insecure JWT Secret
**Current**: `your-super-secret-jwt-key-change-this-in-production`
**Problem**: Default development secret
**Impact**: CRITICAL SECURITY ISSUE - anyone can forge tokens
**Solution Required**: Use generated secure secret

---

## 🎯 Required Before Mainnet Deployment

### Option A: Full Production Setup (Recommended)
Set up proper production infrastructure:

1. **Production Database**
   - Create PostgreSQL on Render/Supabase/Railway
   - Get connection string
   - Run migrations

2. **Backend Environment Variables**
   - Update all secrets
   - Configure mainnet RPC
   - Set production URLs

3. **Deploy to Production**
   - Push to Render
   - Verify health
   - Test API endpoints

### Option B: Quick Migration (Faster)
Use existing Render backend with quick fixes:

1. **Add production database to Render**
   - Use Render's PostgreSQL addon
   - Update DATABASE_URL in Render dashboard

2. **Update Render environment variables**
   - Set secure JWT_SECRET
   - Update to mainnet RPC
   - Change NODE_ENV to production

3. **Restart backend service**

---

## 📊 Current vs Required Configuration

### Backend Environment Variables

| Variable | Current (Dev) | Required (Prod) | Status |
|----------|---------------|-----------------|--------|
| NODE_ENV | development | production | ⚠️ |
| DATABASE_URL | localhost | Render PostgreSQL | ⚠️ |
| JWT_SECRET | insecure-dev-secret | Secure 512-bit | ⚠️ |
| SOLANA_RPC_URL | api.devnet.solana.com | api.mainnet-beta.solana.com | ⚠️ |
| GAME_ESCROW_PROGRAM_ID | devnet ID | mainnet ID (TBD) | ⚠️ |
| CORS_ORIGINS | localhost:8081 | Production domains | ⚠️ |

### Smart Contract

| Item | Current | Target | Status |
|------|---------|--------|--------|
| Network | Devnet | Mainnet | ⚠️ |
| Program ID | 9jsNDSz...h1Te | TBD (after deploy) | ⚠️ |
| Authority | G4WAtE...3kGG | Same (already funded) | ✅ |
| Treasury | 7xM9TX...i2qY | Confirm for mainnet | ⚠️ |

---

## 🚀 Recommended Deployment Path

### Step 1: Set Up Production Database (15 mins)
```bash
# Option A: Render PostgreSQL
# 1. Go to Render dashboard
# 2. Add PostgreSQL database to your backend service
# 3. Copy the Internal Database URL
# 4. Add to environment variables

# Option B: Supabase (Free tier available)
# 1. Sign up at supabase.com
# 2. Create new project
# 3. Get connection string from settings
# 4. Add to Render environment variables
```

### Step 2: Update Render Environment Variables (10 mins)
Go to `https://dashboard.render.com` and update:
```bash
NODE_ENV=production
DATABASE_URL=<production_postgres_url>
JWT_SECRET=<generated_secure_secret_from_file>
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
CORS_ORIGINS=https://korus.app,https://www.korus.app
```

### Step 3: Run Database Migrations (5 mins)
```bash
# SSH into Render or run via Render shell
npx prisma migrate deploy
```

### Step 4: Deploy Smart Contract (30 mins)
```bash
# Switch to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# Deploy contract
cd korus-contracts
./scripts/deploy-mainnet.sh

# Note the new Program ID
```

### Step 5: Update Backend with Mainnet Program ID (5 mins)
Update in Render dashboard:
```bash
GAME_ESCROW_PROGRAM_ID=<new_mainnet_program_id>
```

### Step 6: Update Frontend (10 mins)
```bash
# Update .env
EXPO_PUBLIC_SOLANA_NETWORK=mainnet-beta
EXPO_PUBLIC_GAME_ESCROW_PROGRAM_ID=<new_mainnet_program_id>

# Update config/environment.ts
# Rebuild app
```

### Step 7: Test Everything (30 mins)
- Create test game with 0.01 SOL
- Join and complete game
- Verify payouts
- Check platform fee collection

---

## 💰 Cost Summary

### One-Time Costs
- Smart contract deployment: ~2-3 SOL ($300-450)
- Testing games: ~0.05 SOL ($7)
- **Total**: ~3-5 SOL ($450-750)

### Monthly Costs
- Render backend: $7-25/month
- PostgreSQL database: $5-20/month (or free Supabase tier)
- RPC (optional premium): $50-200/month
- **Total**: $12-245/month

---

## 🔒 Security Generated

### JWT Secret (Use in Production)
**Location**: `/tmp/korus-jwt-secret.txt`
**Length**: 512 bits
**Usage**: Copy to Render environment as `JWT_SECRET`

### Authority Keypair Backup
**Location**: `~/Desktop/korus-authority-BACKUP-*.json`
**Usage**: Keep safe offline, needed for backend game completion

---

## ⚡ Quick Start Commands

### If you have production database ready:
```bash
# 1. Update Render env vars (via dashboard)
# 2. Deploy contract
cd korus-contracts
solana config set --url https://api.mainnet-beta.solana.com
./scripts/deploy-mainnet.sh

# 3. Update configs with new program ID
# 4. Test
```

### If you need to set up database first:
```bash
# 1. Set up PostgreSQL on Render or Supabase
# 2. Get DATABASE_URL
# 3. Add to Render environment
# 4. Run migrations
# 5. Then proceed with contract deployment
```

---

## 🎯 Decision Time

**You have two options:**

### Option 1: Set up production database first (Recommended)
- Ensures backend is fully production-ready
- Cleaner deployment
- Less risk of issues
- **Time**: +30 minutes

### Option 2: Deploy contract now, fix backend later
- Get contract deployed faster
- Can test with existing backend temporarily
- Fix production issues as you find them
- **Time**: Faster but riskier

**Which would you like to do?**

---

## 📝 Next Steps

Tell me:
1. Do you have a production database ready? (Yes/No/Need to set up)
2. Is the treasury wallet `7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY` correct for mainnet?
3. Ready to proceed with deployment? (Yes/Review first)

Type your response and I'll guide you through the next steps!