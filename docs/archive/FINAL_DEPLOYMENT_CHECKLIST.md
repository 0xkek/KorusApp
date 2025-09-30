# 🚨 FINAL MAINNET DEPLOYMENT CHECKLIST

## ⛔ DO NOT DEPLOY UNTIL ALL ITEMS ARE CHECKED

### 1. Code Review ⚠️
- [ ] Contract has authority-only game completion
- [ ] 10-minute timeout protection works
- [ ] Game cancellation refunds both players
- [ ] One game per player limit enforced
- [ ] 2% platform fee calculated correctly
- [ ] No duplicate game completion possible
- [ ] Wager limits: 0.01 - 1 SOL enforced

### 2. Build Verification 🔨
- [ ] Docker installed and working
- [ ] Run `./verify-before-mainnet.sh` successfully
- [ ] Program ID matches in:
  - [ ] lib.rs source code
  - [ ] mainnet-final.json keypair
  - [ ] No devnet IDs anywhere
- [ ] Binary built successfully (~314KB)

### 3. Wallet Setup 💰
- [ ] Authority wallet has 2.997 SOL (enough for deployment)
- [ ] Authority private key on Render (already done ✓)
- [ ] Platform wallet configured (already done ✓)

### 4. Backend Ready 🖥️
- [ ] AUTHORITY_WALLET_ADDRESS on Render ✓
- [ ] AUTHORITY_PRIVATE_KEY on Render ✓
- [ ] Ready to update SOLANA_RPC_URL to mainnet
- [ ] Ready to update GAME_ESCROW_PROGRAM_ID

### 5. Frontend Ready 📱
- [ ] Config ready to switch to mainnet
- [ ] Wallet adapters tested
- [ ] Error handling for mainnet

### 6. Testing Complete ✅
- [ ] All game types tested on devnet
- [ ] Timeout scenario tested
- [ ] Cancellation tested
- [ ] Fee distribution verified

### 7. Legal & Business 📋
- [ ] Terms of service ready
- [ ] Age verification plan (18+)
- [ ] Understand local gambling laws
- [ ] Support process for disputes

### 8. Emergency Plan 🚨
- [ ] Know how to pause if issues
- [ ] Monitoring plan for transactions
- [ ] Support contact ready
- [ ] Backup authority wallet secure

## 🚀 DEPLOYMENT STEPS (WHEN READY)

### Step 1: Final Verification
```bash
./verify-before-mainnet.sh
```
✅ Builds but does NOT deploy

### Step 2: Deploy Contract (COSTS 2.5 SOL)
```bash
solana program deploy \
  --url mainnet-beta \
  --keypair authority-keypair.json \
  --program-id korus-contracts/mainnet-final.json \
  korus-contracts/target/deploy/korus_game_escrow.so
```

### Step 3: Initialize Contract
```bash
node init-mainnet-final.js
```

### Step 4: Update Services
1. Render: Update GAME_ESCROW_PROGRAM_ID and SOLANA_RPC_URL
2. Frontend: Update config and deploy
3. Test with 0.01 SOL first

### Step 5: Monitor
- Watch transactions on Solscan
- Check error logs
- Be ready to respond

## ⚠️ FINAL WARNINGS

1. **NO RUSH** - Take your time
2. **TEST FIRST** - Use verification script
3. **SMALL AMOUNTS** - Test with 0.01 SOL first
4. **HAVE SUPPORT** - Be ready for user issues
5. **KEEP KEYS SAFE** - Never share private keys

## 💡 Remember

- Once deployed, program IDs cannot be reused
- Deployment costs are not refundable if mistakes
- Real money will be at stake
- Users trust you with their funds

---

**DO NOT PROCEED WITHOUT CHECKING EVERY BOX ABOVE**