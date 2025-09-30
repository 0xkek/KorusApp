#!/bin/bash

echo "========================================="
echo "🔧 FIX BUILD WITH ANZA PLATFORM TOOLS"
echo "========================================="
echo ""

# Force x86_64 architecture for compatibility
export DOCKER_DEFAULT_PLATFORM=linux/amd64

echo "Program ID: AugM9Nh81Ne3CgTdQFPYqjeNefwfBfDSmTHeg6dNyC6u"
echo ""

cd /Users/maxattard/KorusApp/korus-contracts

echo "Step 1: Cleaning old build..."
rm -rf target/

echo ""
echo "Step 2: Using newer Docker image with platform specification..."
echo "This forces x86_64 emulation for compatibility..."
echo ""

# Use the official Solana image with forced platform
docker run --rm \
    --platform linux/amd64 \
    -v "$(pwd):/workspace" \
    -w /workspace \
    solanalabs/rust:1.75.0 \
    /bin/bash -c "
        # Install Solana tools
        sh -c \"\$(curl -sSfL https://release.anza.xyz/stable/install)\"
        export PATH=\"/root/.local/share/solana/install/active_release/bin:\$PATH\"
        
        # Install Anchor
        cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked
        
        # Build the program
        anchor build
    "

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    ls -lh target/deploy/korus_game_escrow.so
else
    echo "❌ Build failed"
fi