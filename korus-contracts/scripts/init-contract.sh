#!/bin/bash

echo "🚀 Initializing Korus Game Escrow Contract"
echo "=========================================="

# Set up environment
export PATH="/Users/maxattard/.local/share/solana/install/active_release/bin:$PATH"
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=/Users/maxattard/.config/solana/id.json

# Contract details
PROGRAM_ID="3LyQkgPsjogtfv38YWashEJieyjnyoZeK6MPNmzdDz4Q"
TREASURY="7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY"
AUTHORITY="3DeUAVG2HcaKL9vsxn2dFEo7qkC1RPCoAAVpF1uCFMav"

echo "Program ID: $PROGRAM_ID"
echo "Treasury: $TREASURY"
echo "Backend Authority: $AUTHORITY"
echo ""

# Fund the backend authority wallet
echo "💰 Funding backend authority wallet..."
solana airdrop 1 $AUTHORITY --url devnet

# Wait for airdrop
sleep 5

echo ""
echo "📝 Initializing contract..."

# Run initialization using Node script
cd /Users/maxattard/KorusApp/korus-contracts
npm install @coral-xyz/anchor @solana/web3.js --save-dev
node scripts/initialize.js

echo ""
echo "✅ Initialization complete!"