# 🎮 DEVNET TESTING GUIDE

## Setup Complete! ✅
- Backend configured for devnet
- Frontend configured for devnet
- Authority wallet funded with 2 SOL
- Contract: `9rLXaB3a8qeb55N119sC3mjK58LyPeXXnj8vEvm3EWFG`

## How to Test on Your Phone

### 1. Build and Run the App
```bash
# In terminal
npm start

# On your phone
# Scan QR code with Expo Go
```

### 2. Set Your Wallet to Devnet
**In Phantom/Solflare:**
- Settings → Developer Settings
- Network → Devnet
- ✅ You're on devnet!

### 3. Get Devnet SOL for Your Wallet
1. Copy your wallet address from the app
2. Go to: https://faucet.solana.com
3. Paste your address
4. Click "Devnet" 
5. Get 2 SOL (free!)

### 4. Test Game Flow

#### Test 1: Create and Cancel
1. Go to Games tab
2. Create a game (0.1 SOL wager)
3. Wait in lobby
4. Cancel the game
5. ✅ Should get refund

#### Test 2: Play Full Game
**Phone 1 (Creator):**
1. Create game with 0.1 SOL
2. Wait for opponent

**Phone 2 (Joiner):**
1. Join the game
2. Pay 0.1 SOL

**Play the game:**
- Take turns
- Complete the game
- Winner gets 0.196 SOL (2% fee)

#### Test 3: Timeout Win
1. Create and join game
2. Make a move
3. Wait 10 minutes
4. Claim timeout win
5. ✅ Should win automatically

## What to Check

### ✅ Success Indicators
- [ ] Wallet connects on devnet
- [ ] Can create game (SOL goes to escrow)
- [ ] Can join game (SOL goes to escrow)
- [ ] Can cancel (get refund)
- [ ] Winner receives payout
- [ ] 2% fee goes to platform wallet
- [ ] Timeout works after 10 minutes

### ❌ Common Issues

**"Insufficient balance"**
- Get more devnet SOL from faucet

**"Transaction failed"**
- Check wallet is on devnet
- Check backend is using devnet RPC

**"Program error"**
- Check program ID matches
- Check authority wallet has SOL

## View Transactions

Check your transactions on Solana Explorer:
https://explorer.solana.com/address/YOUR_WALLET?cluster=devnet

## Platform Wallet (receives fees)
https://explorer.solana.com/address/7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY?cluster=devnet

## Contract State
https://explorer.solana.com/address/9rLXaB3a8qeb55N119sC3mjK58LyPeXXnj8vEvm3EWFG?cluster=devnet

---

## Ready to Test! 🚀

1. Run the app: `npm start`
2. Switch wallet to devnet
3. Get free SOL
4. Test all game functions
5. Everything works = Ready for mainnet later!