# 🔐 Korus App Wallet Architecture Overview

## Current Wallet Setup

### 1. **Platform Wallet** (`7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY`)
- **Purpose**: Receives platform fees (2% from games), shoutout payments
- **Location**: Configured in Render environment variables
- **Private Key**: Should be in `PLATFORM_WALLET_PRIVATE_KEY` on Render (NOT in code)
- **Current Balance**: 0.1 SOL on mainnet
- **Used in**:
  - `/korus-backend/.env` - PLATFORM_WALLET_ADDRESS
  - Contract initialization as treasury wallet

### 2. **Authority Wallet** (`G4WAtEdLYWpDoxNWKVbd2Pv9LoX2feFSxN7mWUXt3kGG`) 
- **Purpose**: Controls the game escrow contract (can complete games, handle disputes)
- **Location**: Local file `./authority-keypair.json` (NOT in git)
- **Private Key**: Only on your local machine
- **Current Balance**: 0 SOL mainnet, 0.498 SOL devnet
- **Issue**: Backend on Render can't complete games without this key

### 3. **CLI Wallet** (`2FBnS8sWnZXwTSQHqu7ZUUA4wC2mggRFeYgS5q7VzUKJ`)
- **Purpose**: Your personal Solana CLI development wallet
- **Location**: `~/.config/solana/id.json`
- **Private Key**: On your local machine
- **Current Balance**: 0 SOL
- **Not used in app**

### 4. **Team Wallet** (Not yet configured)
- **Purpose**: Would receive 45% of platform revenue
- **Location**: Should be in `TEAM_WALLET_ADDRESS` on Render
- **Currently**: Not set up

## Security Check Results ✅

### No Private Keys Found in Code ✅
- All sensitive files check for environment variables
- Private keys only in:
  - Local `.json` files (not in git)
  - Environment variables on Render
  - Generated helper scripts (not committed)

### Files That Reference Private Keys (Safely):
1. `/korus-backend/src/config/platform.ts` - Reads from `process.env.PLATFORM_WALLET_PRIVATE_KEY`
2. `/utils/secureWallet.ts` - Security utilities, no hardcoded keys
3. Helper scripts (local only, not in production)

## Issues to Address

### 🔴 Critical Issue: Authority Mismatch
**Problem**: The backend on Render can't complete games because it doesn't have the authority wallet's private key.

**Solutions**:
1. **Option A**: Add authority private key to Render as `AUTHORITY_PRIVATE_KEY`
2. **Option B**: Use platform wallet as both treasury AND authority (simpler)
3. **Option C**: Create new wallet specifically for Render backend operations

### 🟡 Missing Configuration
- Team wallet address not configured
- Authority private key not on Render

## Deployment Plan

### For Mainnet Deployment:
1. **Deployment Wallet**: Can use any wallet with 2.5-3 SOL
2. **Authority**: Should be a wallet the backend can access
3. **Treasury**: Platform wallet (already configured)

### Recommended Setup:
```
Platform Wallet (Treasury) → Receives fees
Authority Wallet → Controls contract (backend needs access)
Team Wallet → Receives revenue share
User Wallets → Play games
```

## Next Steps

1. **Decide on Authority Strategy**:
   - Keep separate authority wallet (need to add to Render)
   - OR use platform wallet as authority (simpler)

2. **Fund Deployment**:
   - Need 2.5-3 SOL in whichever wallet you choose

3. **Update Backend**:
   - Add authority private key to Render environment
   - Or refactor to use platform wallet

## Environment Variables Needed on Render

```env
# Currently Set
PLATFORM_WALLET_ADDRESS=7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY
PLATFORM_WALLET_PRIVATE_KEY=[base58 private key]

# Missing (Needed for game completion)
AUTHORITY_PRIVATE_KEY=[base58 private key of authority wallet]

# Optional
TEAM_WALLET_ADDRESS=[team wallet public key]
```

## Summary

✅ **Good**: No private keys exposed in code
✅ **Good**: Platform wallet configured on Render
❌ **Issue**: Authority wallet not accessible to backend
❌ **Issue**: Need funding for mainnet deployment

The wallet architecture makes sense but needs the authority wallet configured on Render for the backend to complete games.