# 🚨 MAINNET DEPLOYMENT REQUIRED

## Current Situation
- ✅ App authentication: **MAINNET**
- ✅ User wallets: **MAINNET** 
- ❌ Game escrow: **DEVNET** (wrong network!)

## Requirements for Mainnet Deployment

### 1. SOL Needed (Real Money)
- **Program deployment:** ~3 SOL ($300-400)
- **State initialization:** ~0.1 SOL ($10)
- **Buffer account:** ~2 SOL ($200)
- **Transaction fees:** ~0.5 SOL ($50)
- **Total: ~5-6 SOL** (~$500-700 at current prices)

### 2. Steps to Deploy

```bash
# 1. Fund your wallet with real SOL
# Buy SOL from exchange (Coinbase, Binance, etc)
# Send to: 2FBnS8sWnZXwTSQHqu7ZUUA4wC2mggRFeYgS5q7VzUKJ

# 2. Generate mainnet program keypair
solana-keygen new -o mainnet-game-escrow.json

# 3. Update program ID in contract
# Edit lib.rs with new program ID

# 4. Build contract
anchor build

# 5. Deploy to mainnet (COSTS REAL MONEY!)
solana program deploy target/deploy/korus_game_escrow.so \
  --program-id mainnet-game-escrow.json \
  --url mainnet-beta

# 6. Initialize on mainnet
node scripts/init-mainnet.js
```

### 3. Security Considerations

⚠️ **CRITICAL: Before deploying with real money:**

1. **Test thoroughly on devnet**
2. **Consider an audit** ($5k-20k)
3. **Use multisig for authority** (not single key)
4. **Have legal terms ready** (gambling laws)
5. **Implement emergency pause**

### 4. Alternative: Use Custom RPC

Instead of public mainnet, use a custom RPC like Helius:
- Better performance
- Higher rate limits
- ~$99/month

## Recommendation

### Option A: Stay on Devnet (For Testing)
- Change app to use devnet
- Test with fake money
- Perfect the system first

### Option B: Deploy to Mainnet (For Production)
- Need ~$700 in SOL
- Real money at risk
- Legal implications

### Option C: Hybrid Approach
- Keep auth on mainnet
- Use wrapped devnet tokens for games
- Switch to mainnet when ready

## Current Devnet Contract (Working)
- Program: `9rLXaB3a8qeb55N119sC3mjK58LyPeXXnj8vEvm3EWFG`
- Authority: `G4WAtEdLYWpDoxNWKVbd2Pv9LoX2feFSxN7mWUXt3kGG`
- Ready for testing

## Next Steps
1. Decide: Testing (devnet) or Production (mainnet)?
2. If mainnet: Get ~6 SOL ready
3. If devnet: Update app configs to use devnet