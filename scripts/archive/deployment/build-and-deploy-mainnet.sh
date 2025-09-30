#!/bin/bash

set -e

echo "========================================="
echo "🚀 MAINNET BUILD AND DEPLOY SCRIPT"
echo "========================================="
echo ""

# Check current balance
BALANCE=$(solana balance 2>/dev/null || echo "0")
echo "Current wallet balance: $BALANCE"
echo ""

# Check if we have Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo "Please install Docker Desktop from:"
    echo "https://www.docker.com/products/docker-desktop/"
    exit 1
fi

echo "✅ Docker found"
echo ""

# Step 1: Generate new program keypair if it doesn't exist
if [ ! -f "korus-contracts/mainnet-final.json" ]; then
    echo "📝 Step 1: Generating new mainnet program keypair..."
    solana-keygen new -o korus-contracts/mainnet-final.json --no-bip39-passphrase --force
    PROGRAM_ID=$(solana-keygen pubkey korus-contracts/mainnet-final.json)
    echo "New Program ID: $PROGRAM_ID"
    
    # Update the program ID in lib.rs
    echo "Updating lib.rs with new program ID..."
    sed -i.bak "s/declare_id!(\".*\");/declare_id!(\"$PROGRAM_ID\");/" \
        korus-contracts/programs/korus-game-escrow/src/lib.rs
else
    PROGRAM_ID=$(solana-keygen pubkey korus-contracts/mainnet-final.json)
    echo "Using existing Program ID: $PROGRAM_ID"
fi

echo ""
echo "📦 Step 2: Building contract with Docker..."
echo "This may take a few minutes..."

# Build using Docker
docker run --rm \
    -v "$(pwd)/korus-contracts:/workspace" \
    -v "$HOME/.config/solana:/root/.config/solana" \
    projectserum/build:v0.27.0 \
    /bin/bash -c "
        cd /workspace && \
        cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked && \
        anchor build
    "

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "🚀 Step 3: Ready to deploy to mainnet"
echo ""
echo "Program ID: $PROGRAM_ID"
echo "Binary: korus-contracts/target/deploy/korus_game_escrow.so"
echo ""
echo "To deploy, run:"
echo "solana program deploy \\"
echo "  --url mainnet-beta \\"
echo "  --keypair authority-keypair.json \\"
echo "  --program-id korus-contracts/mainnet-final.json \\"
echo "  korus-contracts/target/deploy/korus_game_escrow.so"
echo ""
echo "Cost: ~2.5 SOL"
echo "Your balance: $BALANCE"

# Check if balance is sufficient
if [[ $(echo "$BALANCE" | cut -d' ' -f1 | awk '{print ($1 >= 2.5)}') -eq 1 ]]; then
    echo "✅ Sufficient balance for deployment"
    echo ""
    read -p "Deploy now? (yes/no): " DEPLOY
    if [ "$DEPLOY" = "yes" ]; then
        echo "Deploying..."
        solana program deploy \
            --url mainnet-beta \
            --keypair authority-keypair.json \
            --program-id korus-contracts/mainnet-final.json \
            korus-contracts/target/deploy/korus_game_escrow.so
        
        if [ $? -eq 0 ]; then
            echo "✅ DEPLOYMENT SUCCESSFUL!"
            echo "Program deployed to: $PROGRAM_ID"
            echo ""
            echo "Next: Run 'node init-mainnet-final.js' to initialize"
        fi
    fi
else
    echo "⚠️  Insufficient balance for deployment (need 2.5 SOL)"
fi