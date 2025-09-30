#!/bin/bash

set -e

echo "========================================="
echo "🔍 MAINNET PRE-DEPLOYMENT VERIFICATION"
echo "========================================="
echo ""
echo "This script will:"
echo "✓ Check all configurations"
echo "✓ Build the contract"
echo "✓ Verify the binary"
echo "✗ NOT deploy anything"
echo ""

# Step 1: Check current configuration
echo "📋 Step 1: Current Configuration"
echo "---------------------------------"
echo "Authority Wallet: G4WAtEdLYWpDoxNWKVbd2Pv9LoX2feFSxN7mWUXt3kGG"
echo "Treasury Wallet: 7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY"
echo "Your Balance: $(solana balance 2>/dev/null || echo 'Cannot check')"
echo ""

# Step 2: Check the current program ID in source
echo "📝 Step 2: Checking Program ID in source code"
echo "----------------------------------------------"
CURRENT_ID=$(grep 'declare_id!' korus-contracts/programs/korus-game-escrow/src/lib.rs | sed 's/.*"\(.*\)".*/\1/')
echo "Current ID in lib.rs: $CURRENT_ID"

if [ "$CURRENT_ID" = "9rLXaB3a8qeb55N119sC3mjK58LyPeXXnj8vEvm3EWFG" ]; then
    echo "⚠️  WARNING: This is the DEVNET program ID!"
    echo "Need to generate new ID for mainnet"
elif [ "$CURRENT_ID" = "6or9SwGcRK7AJNa6ADDuW2WAD4oe15cG15bKDCBMkSEW" ]; then
    echo "✅ This is a mainnet program ID"
else
    echo "❓ Unknown program ID - verify if this is correct"
fi
echo ""

# Step 3: Check for Docker
echo "🐳 Step 3: Checking Docker"
echo "---------------------------"
if command -v docker &> /dev/null; then
    echo "✅ Docker is installed"
    docker --version
else
    echo "❌ Docker not installed - needed for building"
    echo "Install from: https://www.docker.com/products/docker-desktop/"
    exit 1
fi
echo ""

# Step 4: Verification questions
echo "🔐 Step 4: Security Checklist"
echo "------------------------------"
echo "Please verify these security features are in the contract:"
echo ""
echo "[ ] Authority-only game completion (line 206-209)"
echo "[ ] 10-minute timeout protection (line 290-396)"
echo "[ ] Game cancellation with refunds (line 145-192)"
echo "[ ] One-game-per-player limit (line 36-41)"
echo "[ ] Double-completion prevention (line 212)"
echo "[ ] 2% platform fee (line 219)"
echo "[ ] Minimum wager: 0.01 SOL"
echo "[ ] Maximum wager: 1 SOL"
echo ""

read -p "Have you verified ALL security features? (yes/no): " VERIFIED
if [ "$VERIFIED" != "yes" ]; then
    echo "❌ Please review the contract code first"
    exit 1
fi
echo ""

# Step 5: Generate or verify program keypair
echo "🔑 Step 5: Program Keypair"
echo "---------------------------"
if [ -f "korus-contracts/mainnet-final.json" ]; then
    PROGRAM_ID=$(solana-keygen pubkey korus-contracts/mainnet-final.json)
    echo "Existing mainnet keypair found: $PROGRAM_ID"
    read -p "Use this keypair? (yes/no/regenerate): " USE_KEY
    if [ "$USE_KEY" = "regenerate" ]; then
        echo "Generating new keypair..."
        solana-keygen new -o korus-contracts/mainnet-final.json --no-bip39-passphrase --force
        PROGRAM_ID=$(solana-keygen pubkey korus-contracts/mainnet-final.json)
        echo "New Program ID: $PROGRAM_ID"
    elif [ "$USE_KEY" != "yes" ]; then
        echo "Exiting..."
        exit 1
    fi
else
    echo "No mainnet keypair found"
    read -p "Generate new mainnet keypair? (yes/no): " GEN_KEY
    if [ "$GEN_KEY" = "yes" ]; then
        solana-keygen new -o korus-contracts/mainnet-final.json --no-bip39-passphrase --force
        PROGRAM_ID=$(solana-keygen pubkey korus-contracts/mainnet-final.json)
        echo "Generated Program ID: $PROGRAM_ID"
    else
        echo "Cannot proceed without program keypair"
        exit 1
    fi
fi
echo ""

# Step 6: Update program ID if needed
if [ "$CURRENT_ID" != "$PROGRAM_ID" ]; then
    echo "⚠️  Program ID mismatch!"
    echo "Source code: $CURRENT_ID"
    echo "Keypair:     $PROGRAM_ID"
    read -p "Update source code with keypair ID? (yes/no): " UPDATE_ID
    if [ "$UPDATE_ID" = "yes" ]; then
        # Backup original
        cp korus-contracts/programs/korus-game-escrow/src/lib.rs \
           korus-contracts/programs/korus-game-escrow/src/lib.rs.backup
        
        # Update ID
        sed -i.bak "s/declare_id!(\".*\");/declare_id!(\"$PROGRAM_ID\");/" \
            korus-contracts/programs/korus-game-escrow/src/lib.rs
        echo "✅ Updated lib.rs with: $PROGRAM_ID"
    else
        echo "❌ Cannot build with mismatched IDs"
        exit 1
    fi
fi
echo ""

# Step 7: Test build (NOT DEPLOY)
echo "🔨 Step 6: Test Build (NO DEPLOYMENT)"
echo "--------------------------------------"
echo "Building contract with Docker..."
echo "This will NOT deploy, just build..."
echo ""

docker run --rm \
    -v "$(pwd)/korus-contracts:/workspace" \
    projectserum/build:v0.27.0 \
    /bin/bash -c "
        cd /workspace && \
        cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked &>/dev/null && \
        anchor build
    "

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    
    # Verify the binary
    echo "📦 Binary Information:"
    echo "----------------------"
    ls -lh korus-contracts/target/deploy/korus_game_escrow.so
    echo ""
    
    # Final summary
    echo "========================================="
    echo "✅ VERIFICATION COMPLETE"
    echo "========================================="
    echo ""
    echo "Program ID:     $PROGRAM_ID"
    echo "Authority:      G4WAtEdLYWpDoxNWKVbd2Pv9LoX2feFSxN7mWUXt3kGG"
    echo "Treasury:       7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY"
    echo "Binary:         korus_game_escrow.so"
    echo "Network:        MAINNET"
    echo ""
    echo "⚠️  NOTHING HAS BEEN DEPLOYED"
    echo ""
    echo "To deploy (costs ~2.5 SOL):"
    echo "----------------------------"
    echo "solana program deploy \\"
    echo "  --url mainnet-beta \\"
    echo "  --keypair authority-keypair.json \\"
    echo "  --program-id korus-contracts/mainnet-final.json \\"
    echo "  korus-contracts/target/deploy/korus_game_escrow.so"
    echo ""
    echo "⚠️  ONLY run the deploy command when you are 100% ready!"
else
    echo "❌ Build failed!"
    echo "Fix the issues before proceeding"
    exit 1
fi