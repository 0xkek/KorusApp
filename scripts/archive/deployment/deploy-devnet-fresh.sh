#!/bin/bash

# Deploy fresh game escrow program to devnet with correct program ID

set -e

echo "🚀 Deploying Korus Game Escrow to Devnet..."

# Switch to devnet
solana config set --url https://api.devnet.solana.com

# Check authority wallet balance
echo "💰 Checking authority balance..."
BALANCE=$(solana balance --lamports)
MIN_BALANCE=2000000000  # 2 SOL in lamports

if [ "$BALANCE" -lt "$MIN_BALANCE" ]; then
    echo "📥 Requesting airdrop..."
    solana airdrop 2
    sleep 5
fi

echo "🔑 Authority: $(solana address)"
echo "💰 Balance: $(solana balance)"

# Build the program
echo "🔨 Building program..."
cd korus-contracts
anchor build

# Deploy the program
echo "🚀 Deploying program..."
anchor deploy --program-id AugM9Nh81Ne3CgTdQFPYqjeNefwfBfDSmTHeg6dNyC6u

# Verify deployment
echo "✅ Verifying deployment..."
solana program show AugM9Nh81Ne3CgTdQFPYqjeNefwfBfDSmTHeg6dNyC6u

# Initialize state
echo "🔧 Initializing program state..."
cd ..
node initialize-state.js

echo "🎉 Deployment complete! Your game escrow is ready for transactions."