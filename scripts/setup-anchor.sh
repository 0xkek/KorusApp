#!/bin/bash

# Korus Smart Contract Setup Script
# This script installs all dependencies needed for Anchor development

set -e

echo "🚀 Korus Smart Contract Setup"
echo "=============================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "✅ macOS detected"
    OS="mac"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "✅ Linux detected"
    OS="linux"
else
    echo "❌ Unsupported OS: $OSTYPE"
    exit 1
fi

# 1. Install Rust
if command_exists rustc; then
    echo -e "${GREEN}✅ Rust already installed${NC}"
    rustc --version
else
    echo -e "${YELLOW}📦 Installing Rust...${NC}"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
fi

# 2. Install Solana CLI
if command_exists solana; then
    echo -e "${GREEN}✅ Solana CLI already installed${NC}"
    solana --version
else
    echo -e "${YELLOW}📦 Installing Solana CLI...${NC}"
    sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
    export PATH="/Users/$USER/.local/share/solana/install/active_release/bin:$PATH"
    
    # Add to shell profile
    if [[ "$SHELL" == *"zsh"* ]]; then
        echo 'export PATH="/Users/$USER/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.zshrc
    else
        echo 'export PATH="/Users/$USER/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
    fi
fi

# 3. Install Anchor
if command_exists anchor; then
    echo -e "${GREEN}✅ Anchor already installed${NC}"
    anchor --version
else
    echo -e "${YELLOW}📦 Installing Anchor...${NC}"
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    avm install latest
    avm use latest
fi

# 4. Create or verify Solana wallet
WALLET_PATH="$HOME/.config/solana/id.json"
if [ -f "$WALLET_PATH" ]; then
    echo -e "${GREEN}✅ Solana wallet found${NC}"
    PUBKEY=$(solana address)
    echo "Wallet address: $PUBKEY"
else
    echo -e "${YELLOW}🔑 Creating new Solana wallet...${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Save your seed phrase in a secure location!${NC}"
    solana-keygen new -o "$WALLET_PATH"
fi

# 5. Configure Solana to use devnet
echo -e "${YELLOW}🌐 Configuring Solana for devnet...${NC}"
solana config set --url devnet
solana config get

# 6. Airdrop SOL for testing
echo -e "${YELLOW}💰 Requesting devnet SOL airdrop...${NC}"
solana airdrop 2 || echo -e "${RED}Failed to airdrop. You may need to wait or try again later.${NC}"
solana balance

# 7. Navigate to contracts directory
cd korus-contracts

# 8. Install Node dependencies
echo -e "${YELLOW}📦 Installing Node dependencies...${NC}"
npm install

# 9. Build contracts
echo -e "${YELLOW}🔨 Building smart contracts...${NC}"
anchor build

# 10. Display next steps
echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Run tests: anchor test"
echo "2. Deploy to devnet: anchor deploy --provider.cluster devnet"
echo "3. Initialize contracts: npx ts-node scripts/deploy.ts"
echo ""
echo "Program IDs:"
echo "Game Escrow: $(solana address -k target/deploy/korus_game_escrow-keypair.json 2>/dev/null || echo 'Not built yet')"
echo "Tipping: $(solana address -k target/deploy/korus_tipping-keypair.json 2>/dev/null || echo 'Not built yet')"
echo ""
echo -e "${GREEN}Happy building! 🚀${NC}"