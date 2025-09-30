#!/bin/bash

echo "🚀 MAINNET DEPLOYMENT SCRIPT"
echo "============================"
echo ""
echo "⚠️  THIS WILL DEPLOY TO MAINNET AND COST REAL SOL!"
echo ""

# Check which wallet we're using
WALLET_ADDRESS="G4WAtEdLYWpDoxNWKVbd2Pv9LoX2feFSxN7mWUXt3kGG"

echo "📍 Deployment wallet: $WALLET_ADDRESS"
echo ""

# Check balance
echo "Checking wallet balance..."
node -e "
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
(async () => {
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const wallet = new PublicKey('$WALLET_ADDRESS');
  const balance = await connection.getBalance(wallet);
  const sol = balance / LAMPORTS_PER_SOL;
  console.log('Current balance:', sol.toFixed(4), 'SOL');
  if (sol < 2.5) {
    console.log('❌ Insufficient balance! Need at least 2.5 SOL');
    process.exit(1);
  } else {
    console.log('✅ Sufficient balance for deployment');
  }
})().catch(console.error);
" || exit 1

echo ""
echo "📝 Deployment steps:"
echo "1. Generate new program keypair for mainnet"
echo "2. Build the contract"
echo "3. Deploy to mainnet (~2.5 SOL)"
echo "4. Initialize with authority"
echo ""
read -p "Continue with mainnet deployment? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "Step 1: Generating mainnet program keypair..."

# Use node to generate keypair since solana-keygen not available via npx
node -e "
const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const keypair = Keypair.generate();
fs.writeFileSync('mainnet-program-keypair.json', JSON.stringify(Array.from(keypair.secretKey)));
console.log('Generated program keypair');
console.log('Program ID:', keypair.publicKey.toString());
"

PROGRAM_ID=$(node -e "
const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('mainnet-program-keypair.json'));
const keypair = Keypair.fromSecretKey(new Uint8Array(data));
console.log(keypair.publicKey.toString());
")
echo "New program ID: $PROGRAM_ID"

echo ""
echo "Step 2: Updating program ID in lib.rs..."
sed -i.bak "s/9rLXaB3a8qeb55N119sC3mjK58LyPeXXnj8vEvm3EWFG/$PROGRAM_ID/g" ../programs/korus-game-escrow/src/lib.rs

echo ""
echo "Step 3: Building contract..."
cd .. && anchor build || exit 1

echo ""
echo "Step 4: Deploying to mainnet..."
echo "⏳ This will take a few minutes and cost ~2.5 SOL..."

solana program deploy \
  --url mainnet-beta \
  --keypair ../authority-keypair.json \
  --program-id scripts/mainnet-program-keypair.json \
  target/deploy/korus_game_escrow.so

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ DEPLOYMENT SUCCESSFUL!"
    echo "Program ID: $PROGRAM_ID"
    echo ""
    echo "Next step: Run init-mainnet.js to initialize the contract"
else
    echo "❌ Deployment failed"
    # Restore original program ID
    mv ../programs/korus-game-escrow/src/lib.rs.bak ../programs/korus-game-escrow/src/lib.rs
    exit 1
fi