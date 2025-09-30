# Korus Mainnet Deployment - Pre-Flight Checklist

## Current State Verification ✓

### Devnet Information
- **Current Network**: Devnet (`api.devnet.solana.com`)
- **Devnet Program ID** (in code): `9jsNDSzvsRHH8KUhFwLdEeEKL6nTWhx4YgzmdkhEh1Te`
- **Authority Wallet**: `G4WAtEdLYWpDoxNWKVbd2Pv9LoX2feFSxN7mWUXt3kGG`
- **Deployment Wallet Balance**: `5.1 SOL` ✓ (sufficient for mainnet deployment)

### Files Ready
- ✅ `authority-keypair.json` exists
- ✅ `target/deploy/korus_game_escrow-keypair.json` exists
- ✅ Smart contract compiled and working on devnet

---

## Pre-Deployment Checklist

### 1. Wallet Security
- [ ] **CRITICAL**: Backup `authority-keypair.json` to secure offline location
- [ ] **CRITICAL**: Backup deployment wallet private key
- [ ] Verify you control the authority wallet: `G4WAtEdLYWpDoxNWKVbd2Pv9LoX2feFSxN7mWUXt3kGG`
- [ ] Have treasury wallet address ready (where platform fees go)
- [ ] Consider using hardware wallet or multisig for treasury

### 2. Cost Understanding
Total estimated cost: **~3-5 SOL**
- Contract deployment: ~2-3 SOL
- Contract initialization: ~0.05 SOL
- Testing (2-3 games @ 0.01 SOL each): ~0.05 SOL
- Buffer for failed transactions: ~0.5 SOL

**Your current balance: 5.1 SOL** ✅ Sufficient

### 3. Backend Readiness
- [ ] Production database is set up and accessible
- [ ] Have production DATABASE_URL ready
- [ ] Have production API URL ready (where backend will be hosted)
- [ ] Backend environment variables documented
- [ ] Know where backend will be deployed (Railway/Render/AWS/etc)

### 4. Frontend Readiness
- [ ] Know where frontend will be hosted/distributed
- [ ] Have production API URL for EXPO_PUBLIC_API_URL
- [ ] Optional: Helius API key for NFT support

### 5. Smart Contract Verification
- [ ] Contract builds successfully: `anchor build`
- [ ] Contract has all devnet fixes included
- [ ] Program ID will be updated after deployment
- [ ] Treasury wallet address is known and secure

### 6. Monitoring Setup
- [ ] Know how to access Solscan: `https://solscan.io`
- [ ] Have way to monitor backend logs
- [ ] Have way to check database
- [ ] Plan for error alerting (Sentry/etc)

---

## Deployment Timeline

### Estimated Time: 2-3 hours total

1. **Contract Deployment** (30 mins)
   - Switch to mainnet
   - Build contract
   - Deploy to mainnet
   - Update code with new program ID
   - Rebuild and verify

2. **Contract Initialization** (15 mins)
   - Run init script
   - Verify on Solscan
   - Check state

3. **Backend Deployment** (45 mins)
   - Update environment variables
   - Run database migrations
   - Deploy to production
   - Verify API is accessible

4. **Frontend Configuration** (30 mins)
   - Update environment config
   - Update code with mainnet IDs
   - Build for production
   - Test locally

5. **Testing** (30 mins)
   - Create test game (0.01 SOL)
   - Join test game
   - Complete test game
   - Verify payouts
   - Test cancellation

6. **Final Verification** (15 mins)
   - Check all features work
   - Monitor for errors
   - Document any issues

---

## Before You Proceed - Confirm These

### Critical Questions
1. **Do you have your treasury wallet address?**
   - This is where 2% platform fees will be sent
   - Make sure it's secure (hardware wallet recommended)
   - Address: `_______________________________`

2. **Is your backend database ready?**
   - Production PostgreSQL database set up?
   - Have DATABASE_URL connection string?
   - Database is accessible from backend server?

3. **Where will you deploy the backend?**
   - Railway? Render? AWS? Other?
   - Have account set up and ready?
   - Know the production API URL?

4. **Do you understand mainnet costs REAL SOL?**
   - Every transaction uses real money
   - Every game wager is real money
   - Platform fees are real money
   - Test carefully with small amounts first

5. **Have you backed up your keys?**
   - `authority-keypair.json` backed up? (CRITICAL)
   - Deployment wallet private key backed up?
   - Stored in secure, offline location?

---

## Deployment Commands Summary

```bash
# 1. Switch to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# 2. Build contract
cd korus-contracts
anchor clean
anchor build

# 3. Get new program ID
solana-keygen pubkey target/deploy/korus_game_escrow-keypair.json

# 4. Update lib.rs with new ID
# Edit programs/korus-game-escrow/src/lib.rs
# declare_id!("NEW_PROGRAM_ID_FROM_STEP_3");

# 5. Rebuild
anchor build

# 6. Deploy to mainnet (THIS COSTS ~2-3 SOL)
anchor deploy --provider.cluster mainnet

# 7. Update Anchor.toml
# Add [programs.mainnet] section

# 8. Initialize contract
cd scripts
# Edit init-mainnet.js with new program ID and treasury
node init-mainnet.js

# 9. Verify on Solscan
# https://solscan.io/account/YOUR_NEW_PROGRAM_ID
```

---

## What Can Go Wrong?

### Common Issues & Solutions

1. **Insufficient balance error**
   - Solution: Add more SOL to deployment wallet

2. **Program already deployed error**
   - Solution: Either use existing program or generate new keypair

3. **Initialization fails**
   - Solution: Check authority wallet has SOL, check program ID is correct

4. **Frontend can't connect**
   - Solution: Verify program ID in environment config matches deployed ID

5. **Games fail on creation**
   - Solution: Check backend has correct program ID and authority keypair

---

## Rollback Plan

If deployment fails or critical issues occur:

1. **Stop immediately**
2. **Do not panic** - deployed SOL can usually be recovered
3. **Keep devnet running** as fallback
4. **Document what went wrong**
5. **Reach out for help if needed**

To rollback:
- Frontend: Keep using devnet environment
- Backend: Point back to devnet RPC and program ID
- Users: No impact if you don't publish new version

---

## Post-Deployment Actions

After successful mainnet deployment:

1. **Document everything**
   - New mainnet program ID
   - Transaction signatures
   - Treasury address
   - All environment variables

2. **Test thoroughly**
   - Create multiple test games
   - Test all 3 game types
   - Test with different wallets
   - Verify platform fees are collected

3. **Monitor for 24 hours**
   - Watch for errors in logs
   - Check database for correct data
   - Monitor transaction success rate
   - Watch platform fee collection

4. **Gradual rollout**
   - Start with low wager limits (0.01-0.1 SOL)
   - Monitor for a week
   - Gradually increase limits

---

## Ready to Deploy?

✅ **Checklist Complete** - Only proceed when ALL items above are checked

Run the deployment with:
```bash
# Execute from korus-contracts directory
./scripts/deploy-mainnet.sh
```

Or follow PRODUCTION_MIGRATION.md for step-by-step guide.

---

**Last reminder**: This uses REAL SOL on mainnet. Double-check everything!

**Your wallet balance**: 5.1 SOL ✓
**Estimated cost**: ~3-5 SOL ✓
**Buffer**: ~0-2 SOL remaining ✓

Good luck! 🚀