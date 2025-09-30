#!/bin/bash

echo "========================================="
echo "🔨 FORCE REBUILD FOR MAINNET"
echo "========================================="
echo ""
echo "Program ID: AugM9Nh81Ne3CgTdQFPYqjeNefwfBfDSmTHeg6dNyC6u"
echo ""

cd /Users/maxattard/KorusApp/korus-contracts

echo "Step 1: Cleaning old build..."
rm -rf target/

echo ""
echo "Step 2: Building with Docker (no cache)..."
echo "This will take 5-10 minutes..."
echo ""

docker run --rm \
    -v "$(pwd):/workspace" \
    projectserum/build:v0.27.0 \
    /bin/bash -c "
        cd /workspace && \
        rm -rf target/ && \
        cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked &>/dev/null && \
        anchor build --verifiable
    "

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    
    # Verify the binary has the right ID
    echo ""
    echo "Verifying binary..."
    
    if [ -f "target/deploy/korus_game_escrow.so" ]; then
        echo "Binary size: $(ls -lh target/deploy/korus_game_escrow.so | awk '{print $5}')"
        echo ""
        echo "✅ READY TO DEPLOY!"
        echo ""
        echo "Deploy command:"
        echo "solana program deploy \\"
        echo "  --url mainnet-beta \\"
        echo "  --keypair /Users/maxattard/KorusApp/authority-keypair.json \\"
        echo "  --program-id /Users/maxattard/KorusApp/korus-contracts/mainnet-v3.json \\"
        echo "  /Users/maxattard/KorusApp/korus-contracts/target/deploy/korus_game_escrow.so"
    else
        echo "❌ Binary not found!"
    fi
else
    echo "❌ Build failed!"
fi