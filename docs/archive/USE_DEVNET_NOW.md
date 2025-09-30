# 🎮 USE DEVNET FOR TESTING NOW

## Working Devnet Contract
- **Program ID:** `9rLXaB3a8qeb55N119sC3mjK58LyPeXXnj8vEvm3EWFG`
- **Network:** Devnet
- **Status:** ✅ Deployed and Initialized
- **Authority:** `G4WAtEdLYWpDoxNWKVbd2Pv9LoX2feFSxN7mWUXt3kGG`
- **Treasury:** `7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY`

## Update Your App

### 1. Backend (.env on Render)
```env
SOLANA_RPC_URL=https://api.devnet.solana.com
GAME_ESCROW_PROGRAM_ID=9rLXaB3a8qeb55N119sC3mjK58LyPeXXnj8vEvm3EWFG
# Authority keys already configured ✓
```

### 2. Frontend (config/environment.ts)
```typescript
export const config = {
  solanaCluster: 'devnet',
  solanaRpcUrl: 'https://api.devnet.solana.com',
  gameEscrowProgramId: '9rLXaB3a8qeb55N119sC3mjK58LyPeXXnj8vEvm3EWFG',
};
```

### 3. Get Devnet SOL (FREE)
```bash
# Airdrop 2 SOL to your wallet
curl -X POST -H "Content-Type: application/json" -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "requestAirdrop",
  "params": ["YOUR_WALLET_ADDRESS", 2000000000]
}' https://api.devnet.solana.com
```

Or use: https://faucet.solana.com

## Why This Makes Sense

1. **Test Everything Free** - No real money at risk
2. **Exact Same Code** - Devnet = Mainnet functionality
3. **Your App Isn't Public** - Only you testing
4. **Build Issues on Mac** - Docker/Anza tools broken for ARM64

## When Ready for Mainnet

1. Use a cloud service (GitHub Actions, GitLab CI)
2. Or rent a Linux VPS for 1 hour (~$5)
3. Build there and deploy

## Test These Now on Devnet

- [ ] Create a game with 0.1 SOL
- [ ] Join with another wallet
- [ ] Complete the game
- [ ] Test timeout (wait 10 min)
- [ ] Test cancellation
- [ ] Verify fees work

---

**Stop fighting the build tools. Test on devnet now, deploy to mainnet later when you have proper build environment.**