# Korus Production Migration - Devnet to Mainnet

## Current State
- **Devnet Program**: `AugM9Nh81Ne3CgTdQFPYqjeNefwfBfDSmTHeg6dNyC6u`
- **Old Mainnet Program**: `3LyQkgPsjogtfv38YWashEJieyjnyoZeK6MPNmzdDz4Q` (previous deployment)
- **Backend**: Running on devnet
- **Frontend**: Connected to devnet

## Migration Goals
1. Deploy fresh contract to mainnet with all fixes from devnet testing
2. Update all configurations to point to mainnet
3. Test with real SOL (small amounts)
4. Go live

---

## Step-by-Step Migration

### Phase 1: Pre-Deployment Checks ✓

#### 1.1 Verify Wallet Balances
```bash
# Check your deployment wallet
solana config set --url https://api.mainnet-beta.solana.com
solana balance

# You need:
# - 3-5 SOL for contract deployment
# - 1-2 SOL for testing games
# - Total: ~5-7 SOL minimum
```

#### 1.2 Verify Authority Keypair
```bash
# Ensure authority keypair exists and is funded
solana-keygen pubkey authority-keypair.json

# Check its balance
solana balance $(solana-keygen pubkey authority-keypair.json)
```

#### 1.3 Prepare Treasury Wallet
- [ ] Treasury wallet address ready
- [ ] Treasury wallet is secure (hardware wallet recommended)
- [ ] Document treasury address in secure location

---

### Phase 2: Contract Deployment

#### 2.1 Switch to Mainnet
```bash
cd korus-contracts

# Set Solana CLI to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# Verify
solana config get
```

#### 2.2 Build Contract
```bash
# Clean previous builds
anchor clean

# Build for mainnet
anchor build

# Get the program ID
solana-keygen pubkey target/deploy/korus_game_escrow-keypair.json
```

#### 2.3 Update Program ID in Code
```rust
// In programs/korus-game-escrow/src/lib.rs
declare_id!("YOUR_NEW_MAINNET_PROGRAM_ID_FROM_STEP_2.2");
```

#### 2.4 Rebuild with Correct ID
```bash
anchor build
```

#### 2.5 Deploy to Mainnet
```bash
# Deploy (this costs ~2-3 SOL)
anchor deploy --provider.cluster mainnet

# Save the transaction signature and program ID
```

#### 2.6 Update Anchor.toml
```toml
[programs.mainnet]
korus_game_escrow = "YOUR_NEW_MAINNET_PROGRAM_ID"

[provider]
cluster = "Mainnet"
```

---

### Phase 3: Initialize Contract

#### 3.1 Update Initialization Script
```bash
# Edit korus-contracts/scripts/init-mainnet.js
# Set:
# - PROGRAM_ID: Your new mainnet program ID
# - TREASURY_ADDRESS: Your treasury wallet
# - RPC_URL: Mainnet RPC (or Helius/QuickNode)
```

#### 3.2 Run Initialization
```bash
cd korus-contracts/scripts
node init-mainnet.js

# Verify on Solscan:
# https://solscan.io/account/YOUR_PROGRAM_ID
```

---

### Phase 4: Backend Configuration

#### 4.1 Update Backend Environment
```bash
cd korus-backend

# Create or update .env with:
NODE_ENV=production

# Solana Mainnet
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# OR use premium RPC:
# SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Game Escrow Contract
GAME_ESCROW_PROGRAM_ID=YOUR_NEW_MAINNET_PROGRAM_ID

# Authority (base58 private key from authority-keypair.json)
GAME_AUTHORITY_PRIVATE_KEY=YOUR_AUTHORITY_PRIVATE_KEY_BASE58

# Wallets
TREASURY_WALLET_ADDRESS=YOUR_TREASURY_WALLET
PLATFORM_WALLET_ADDRESS=YOUR_PLATFORM_WALLET
TEAM_WALLET_ADDRESS=YOUR_TEAM_WALLET

# Database (use production database)
DATABASE_URL=your_production_postgres_url

# Security
JWT_SECRET=your_secure_jwt_secret
CORS_ORIGINS=https://korus.app,https://www.korus.app
```

#### 4.2 Deploy Backend
```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate deploy

# Build TypeScript
npm run build

# Test locally first
npm start

# Then deploy to production (Railway/Render/etc)
```

---

### Phase 5: Frontend Configuration

#### 5.1 Update Frontend Environment
Create `.env` file:
```bash
# Environment
EXPO_PUBLIC_ENVIRONMENT=production

# Backend API
EXPO_PUBLIC_API_URL=https://your-production-backend.com/api

# Solana Mainnet
EXPO_PUBLIC_SOLANA_NETWORK=mainnet-beta
EXPO_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Game Escrow Contract
EXPO_PUBLIC_GAME_ESCROW_PROGRAM_ID=YOUR_NEW_MAINNET_PROGRAM_ID

# Optional: Helius for NFTs
EXPO_PUBLIC_HELIUS_API_KEY=your_helius_mainnet_key
```

#### 5.2 Update config/environment.ts
```typescript
production: {
  apiUrl: process.env.EXPO_PUBLIC_API_URL || '',
  solanaCluster: 'solana:mainnet-beta',
  solanaRpcUrl: 'https://api.mainnet-beta.solana.com',
  gameEscrowProgramId: 'YOUR_NEW_MAINNET_PROGRAM_ID',
  smartContractsEnabled: true,
  // ... rest of config
}
```

#### 5.3 Build and Test Locally
```bash
# Clear cache
npm start -- --clear

# Test on device/simulator
npm run android
# or
npm run ios
```

---

### Phase 6: Testing on Mainnet

#### 6.1 Create Test Game (0.01 SOL)
1. Connect wallet with small amount of SOL
2. Create a TicTacToe game with 0.01 SOL wager
3. Verify transaction on Solscan
4. Check game appears in backend database

#### 6.2 Join Test Game
1. Use second wallet
2. Join the game
3. Verify escrow has both wagers (0.02 SOL total)

#### 6.3 Complete Test Game
1. Play a few moves
2. Complete the game (one player wins)
3. Verify winner receives ~0.0196 SOL (98% of 0.02)
4. Verify platform receives ~0.0004 SOL (2% fee)

#### 6.4 Test Cancellation
1. Create game with 0.01 SOL
2. Cancel before anyone joins
3. Verify full refund received

---

### Phase 7: Monitoring & Verification

#### 7.1 Monitor Contract Activity
```bash
# Check program activity on Solscan
https://solscan.io/account/YOUR_PROGRAM_ID

# Monitor transactions
https://solscan.io/account/YOUR_PROGRAM_ID#txs
```

#### 7.2 Check Backend Logs
```bash
# Verify games are being created/completed
# Check for any errors
# Monitor database for correct data
```

#### 7.3 Test All Features
- [ ] Wallet connection (Phantom, Solflare)
- [ ] Post creation
- [ ] Game creation (all 3 games)
- [ ] Game joining
- [ ] Game completion
- [ ] Game cancellation
- [ ] Timeout mechanism
- [ ] Subscription payments
- [ ] NFT avatars
- [ ] SNS domains

---

### Phase 8: Go Live

#### 8.1 Gradual Rollout
1. Start with 0.01-0.1 SOL wager limits
2. Monitor for 24-48 hours
3. Gradually increase to 1 SOL max

#### 8.2 Announce Launch
- Social media posts
- Update documentation
- Notify early testers

#### 8.3 Monitor Metrics
Track daily:
- Games created
- Games completed
- Total volume
- Platform fees collected
- User wallet connections
- Error rates

---

## Important Notes

### Cost Breakdown (Mainnet)
- Contract deployment: ~2-3 SOL
- Contract initialization: ~0.05 SOL
- Per game creation: ~0.002 SOL (rent)
- Total initial: ~3-5 SOL

### RPC Recommendations
For production, use premium RPC:
- **Helius**: https://helius.xyz (best for NFTs)
- **QuickNode**: https://quicknode.com (reliable)
- **Triton**: https://triton.one (fast)

Public RPC (`api.mainnet-beta.solana.com`) may be rate-limited.

### Security Checklist
- [ ] Authority keypair is secured offline
- [ ] Treasury is multisig or hardware wallet
- [ ] Environment variables not committed to git
- [ ] CORS restricted to production domain
- [ ] Database connection uses SSL
- [ ] JWT secret is secure (256+ bits)
- [ ] Rate limiting enabled
- [ ] Logging does not expose sensitive data

### Rollback Plan
If critical issues occur:
1. Frontend: Revert to previous version
2. Backend: Rollback to devnet endpoints temporarily
3. Contract: Cannot rollback (deploy new version if needed)
4. Database: Restore from backup

---

## Quick Command Reference

```bash
# Switch to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# Build and deploy
cd korus-contracts
anchor build
anchor deploy --provider.cluster mainnet

# Initialize contract
cd scripts
node init-mainnet.js

# Check contract state
solana account YOUR_PROGRAM_ID

# Monitor transactions
# Visit: https://solscan.io/account/YOUR_PROGRAM_ID
```

---

## Emergency Contacts

Keep these handy:
- Authority wallet holder: ___________________
- Treasury wallet holder: ___________________
- Backend admin: ___________________
- Database admin: ___________________

## Support Resources

- Solana Docs: https://docs.solana.com
- Anchor Docs: https://www.anchor-lang.com
- Solscan: https://solscan.io
- Helius Dashboard: https://dashboard.helius.dev