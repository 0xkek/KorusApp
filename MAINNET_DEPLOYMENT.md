# Korus Mainnet Deployment Guide

## Pre-Deployment Checklist

### 1. Smart Contract Deployment

#### Prerequisites
- [ ] Funded mainnet wallet with sufficient SOL (minimum 5-10 SOL for deployment + testing)
- [ ] Authority keypair secured and backed up
- [ ] Treasury wallet address prepared for platform fees

#### Steps
```bash
# 1. Switch Solana CLI to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# 2. Check wallet balance (need ~5 SOL minimum)
solana balance

# 3. Build the contract
cd korus-contracts
anchor build

# 4. Get the program ID
solana-keygen pubkey target/deploy/korus_game_escrow-keypair.json

# 5. Update lib.rs with mainnet program ID
# declare_id!("NEW_MAINNET_PROGRAM_ID");

# 6. Rebuild with correct ID
anchor build

# 7. Deploy to mainnet
anchor deploy --provider.cluster mainnet

# 8. Initialize the contract
ts-node scripts/init-mainnet.js
```

### 2. Environment Configuration

#### Frontend (.env)
```bash
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_API_URL=https://your-production-backend.com/api
EXPO_PUBLIC_SOLANA_NETWORK=mainnet-beta
EXPO_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
EXPO_PUBLIC_HELIUS_API_KEY=your_helius_mainnet_key
EXPO_PUBLIC_ALLY_TOKEN_ADDRESS=your_ally_token_mint
```

#### Backend (.env)
```bash
NODE_ENV=production
DATABASE_URL=your_production_postgres_url
JWT_SECRET=your_secure_jwt_secret_256bit

# Solana Mainnet
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta

# Game Escrow Contract
GAME_ESCROW_PROGRAM_ID=your_deployed_mainnet_program_id
GAME_AUTHORITY_KEYPAIR=your_authority_private_key_base58

# Platform Wallets
PLATFORM_WALLET_ADDRESS=your_platform_wallet
PLATFORM_WALLET_PRIVATE_KEY=your_platform_private_key
TEAM_WALLET_ADDRESS=your_team_wallet
TREASURY_WALLET_ADDRESS=your_treasury_wallet

# ALLY Token
ALLY_TOKEN_MINT=your_ally_token_mainnet_mint

# APIs
HELIUS_API_KEY=your_helius_mainnet_key

# Features
ENABLE_WEEKLY_DISTRIBUTION=true
ENABLE_MODERATION=true
ENABLE_REPUTATION=true

# Security
CORS_ORIGINS=https://korus.app,https://www.korus.app
ALLOW_AUTH_BYPASS=false

# Logging
LOG_LEVEL=info
DEBUG_MODE=false
```

### 3. Code Updates Required

#### Update `config/environment.ts` (production section):
- [x] solanaCluster: 'solana:mainnet-beta'
- [x] solanaRpcUrl: Use Helius or QuickNode mainnet RPC
- [x] gameEscrowProgramId: New mainnet program ID
- [x] enableLogging: false
- [x] logLevel: 'error'

#### Update `korus-backend/src/config/solana.ts`:
- [ ] SOLANA_NETWORK: 'mainnet-beta'
- [ ] RPC_URL: Mainnet RPC endpoint
- [ ] GAME_ESCROW_PROGRAM_ID: Mainnet program ID

#### Update `Anchor.toml`:
- [ ] Add [programs.mainnet] section with deployed program ID
- [ ] cluster = "Mainnet"

### 4. Database Migration

```bash
# Production database setup
cd korus-backend

# Run all migrations
npx prisma migrate deploy

# Verify schema
npx prisma db pull
```

### 5. Security Audit

- [ ] All private keys stored in secure environment variables (not in code)
- [ ] CORS properly configured for production domains only
- [ ] Rate limiting enabled on all API endpoints
- [ ] JWT secret is cryptographically secure (256+ bits)
- [ ] Database connection uses SSL
- [ ] ALLOW_AUTH_BYPASS=false
- [ ] DEBUG_MODE=false
- [ ] Sensitive endpoints require authentication
- [ ] Input validation on all user-submitted data
- [ ] SQL injection protection (using Prisma parameterized queries)

### 6. Smart Contract Security

- [ ] Authority wallet is secure and backed up
- [ ] Treasury wallet is a multisig or hardware wallet
- [ ] Wager limits are appropriate (0.01-1 SOL)
- [ ] Platform fee is set correctly (2%)
- [ ] Only authority can complete games
- [ ] Timeout mechanism works correctly
- [ ] Escrow PDAs are secure

### 7. Testing Plan

#### Smart Contract Tests (Mainnet)
```bash
# Use small amounts for initial tests!

# 1. Create a test game with 0.01 SOL
# 2. Join the game from another wallet
# 3. Complete the game and verify payouts
# 4. Test game cancellation
# 5. Test timeout mechanism
# 6. Verify platform fee collection
```

#### Backend Tests
- [ ] Wallet authentication works
- [ ] Game creation stores onChainGameId correctly
- [ ] Game completion updates database
- [ ] User profile updates work
- [ ] Subscription payments are tracked
- [ ] Shoutout posts expire correctly

#### Frontend Tests
- [ ] Wallet connection (Phantom, Solflare on mobile)
- [ ] Post creation and viewing
- [ ] Game creation with wager deposit
- [ ] Game joining and playing
- [ ] Subscription purchase flow
- [ ] NFT avatar selection
- [ ] SNS domain display

### 8. Monitoring Setup

- [ ] Set up error tracking (Sentry configured)
- [ ] Database performance monitoring
- [ ] API response time tracking
- [ ] Smart contract event monitoring
- [ ] Alert system for failed transactions
- [ ] Daily backup of database

### 9. Backup Strategy

- [ ] Authority keypair backed up securely (offline, encrypted)
- [ ] Database daily backups configured
- [ ] Environment variables documented securely
- [ ] Contract source code tagged in git

### 10. Deployment Steps

#### Backend
```bash
cd korus-backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Deploy to production (Railway/Render/etc)
# Ensure environment variables are set

# Run migrations
npm run migrate:deploy

# Start production server
npm start
```

#### Frontend
```bash
cd KorusApp

# Update environment
# Create .env file with production values

# Build production app
npx expo prebuild

# For Android
cd android && ./gradlew assembleRelease

# For iOS (on Mac)
cd ios && pod install
xcodebuild -workspace KorusApp.xcworkspace -scheme KorusApp -configuration Release
```

### 11. Post-Deployment Verification

- [ ] Smart contract deployed and initialized
- [ ] Backend API is responding
- [ ] Database migrations completed
- [ ] Frontend connects to backend
- [ ] Wallet authentication works
- [ ] Create test post
- [ ] Create test game with small wager (0.01 SOL)
- [ ] Join and complete test game
- [ ] Verify payouts received correctly
- [ ] Check platform fee collected

### 12. Rollback Plan

If issues occur:
1. Keep devnet version running as fallback
2. Smart contract cannot be rolled back (deploy new version if needed)
3. Backend: revert to previous git tag
4. Database: restore from backup if needed
5. Frontend: publish previous version to app stores

## Important Notes

### Cost Estimates (Mainnet)
- Smart contract deployment: ~2-3 SOL
- Contract initialization: ~0.1 SOL
- Per game creation: ~0.002-0.005 SOL (rent)
- RPC costs: ~$50-200/month (QuickNode/Helius)

### Recommended RPC Providers
- **Helius**: Best for NFT/DAS support (https://helius.xyz)
- **QuickNode**: Reliable with good uptime (https://quicknode.com)
- **Triton**: Fast and affordable (https://triton.one)

### Wager Recommendations (Initial Launch)
- Start with 0.01 - 0.1 SOL limits
- Monitor for 1-2 weeks
- Gradually increase to 1 SOL maximum

### Monitoring Mainnet Transactions
- Solscan: https://solscan.io
- Solana Explorer: https://explorer.solana.com
- Monitor your program: https://solscan.io/account/YOUR_PROGRAM_ID

## Emergency Contacts

- Authority wallet holder: [Your name/contact]
- Database admin: [Admin contact]
- DevOps: [DevOps contact]

## Mainnet vs Devnet Differences

| Feature | Devnet | Mainnet |
|---------|--------|---------|
| Network | devnet | mainnet-beta |
| SOL Value | Testnet (free) | Real ($) |
| RPC | api.devnet.solana.com | api.mainnet-beta.solana.com |
| Program ID | AugM9Nh81Ne3CgTdQFPYqjeNefwfBfDSmTHeg6dNyC6u | TBD after deployment |
| Wager Limits | 0.01-1 SOL (test) | 0.01-1 SOL (real) |
| Platform Fee | 2% (test) | 2% (real revenue) |

## Post-Launch Monitoring

Monitor these metrics daily for first week:
- Total games created
- Game completion rate
- Failed transactions
- Platform fee collection
- User wallet connections
- Error rates

## Support & Documentation

- GitHub: Repository URL
- API Docs: https://your-backend.com/api-docs
- Status Page: Consider setting up status.korus.app