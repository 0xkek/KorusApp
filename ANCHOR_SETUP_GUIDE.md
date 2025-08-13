# Anchor Development Environment Setup Guide

## 1. Install Prerequisites

### Install Rust
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Verify installation
rustc --version
```

### Install Solana CLI
```bash
# Install Solana (latest stable)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Add to PATH (add to your .bashrc/.zshrc)
export PATH="/Users/$USER/.local/share/solana/install/active_release/bin:$PATH"

# Verify installation
solana --version
```

### Install Anchor
```bash
# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Verify installation
anchor --version
```

## 2. Configure Solana CLI

### Create a new wallet (or use existing)
```bash
# Generate new keypair
solana-keygen new -o ~/.config/solana/id.json

# Or recover existing wallet
solana-keygen recover -o ~/.config/solana/id.json
```

### Set network to devnet (for testing)
```bash
solana config set --url devnet
solana config get
```

### Get some SOL for testing
```bash
# Request airdrop (devnet only)
solana airdrop 2
solana balance
```

## 3. Build and Test Contracts

```bash
cd korus-contracts

# Install dependencies
yarn install

# Build contracts
anchor build

# Run tests on local validator
anchor test

# Run tests on devnet
anchor test -- --provider.cluster devnet
```

## 4. Deploy to Devnet

### Update Anchor.toml with your program IDs
After first build, get your program IDs:
```bash
solana address -k target/deploy/korus_game_escrow-keypair.json
solana address -k target/deploy/korus_tipping-keypair.json
```

Update `Anchor.toml`:
```toml
[programs.devnet]
korus_game_escrow = "YOUR_GAME_ESCROW_PROGRAM_ID"
korus_tipping = "YOUR_TIPPING_PROGRAM_ID"
```

### Deploy
```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Run initialization script
npx ts-node scripts/deploy.ts
```

## 5. Common Issues and Solutions

### Issue: "Insufficient funds"
```bash
# Get more SOL
solana airdrop 2
```

### Issue: "Program already deployed"
```bash
# Upgrade existing program
anchor upgrade target/deploy/korus_game_escrow.so --program-id YOUR_PROGRAM_ID
```

### Issue: "Transaction too large"
```bash
# Increase compute units
solana program deploy target/deploy/korus_game_escrow.so --with-compute-unit-price 1
```

## 6. Verify Deployment

```bash
# Check program deployment
solana program show YOUR_PROGRAM_ID

# Check program accounts
anchor account game-escrow.State YOUR_STATE_ADDRESS --provider.cluster devnet
```

## Next Steps
1. Save deployment info from `deployment.json`
2. Copy IDL files to frontend
3. Update frontend with program IDs
4. Test integration on devnet
5. Prepare for mainnet deployment