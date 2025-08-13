# Korus Smart Contracts

This directory contains the Solana smart contracts for Korus, built with Anchor framework.

## Contracts

### 1. Game Escrow (`korus-game-escrow`)
Handles wagering and escrow for games:
- Create games with wager amounts
- Join games by matching wagers
- Automatic escrow of funds
- Winner determination and payout
- Platform fee collection (2.5%)
- Timeout handling for expired games

### 2. Tipping (`korus-tipping`)
Handles direct tips between users:
- Send tips to content creators
- Track tipping statistics
- Platform fee collection (1%)
- User stats tracking

## Setup

### Prerequisites
1. Install Rust: https://rustup.rs/
2. Install Solana CLI: https://docs.solana.com/cli/install-solana-cli-tools
3. Install Anchor: https://www.anchor-lang.com/docs/installation

### Installation
```bash
# Install dependencies
yarn install

# Build contracts
anchor build
```

## Testing

```bash
# Run tests on local validator
anchor test

# Run tests on devnet
anchor test -- --provider.cluster devnet
```

## Deployment

### 1. Configure Solana CLI
```bash
# Set to devnet (for testing)
solana config set --url devnet

# Set to mainnet (for production)
solana config set --url mainnet-beta

# Create a new wallet or use existing
solana-keygen new -o ~/.config/solana/id.json
```

### 2. Fund your wallet
```bash
# Request airdrop on devnet
solana airdrop 2

# For mainnet, you'll need to transfer SOL to your wallet
```

### 3. Update Anchor.toml
Change the program IDs in `Anchor.toml` to your own:
```toml
[programs.devnet]
korus_game_escrow = "YOUR_PROGRAM_ID_HERE"
korus_tipping = "YOUR_PROGRAM_ID_HERE"
```

### 4. Deploy
```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet
anchor deploy --provider.cluster mainnet-beta

# Run initialization script
ts-node scripts/deploy.ts
```

## Integration

After deployment, update the frontend with:
1. Program IDs from `deployment.json`
2. IDL files from `target/idl/`

In your frontend code:
```typescript
import { gameEscrowClient } from '@/utils/contracts/gameEscrow';

// Initialize with wallet
await gameEscrowClient.initialize(wallet);

// Create a game
const txId = await gameEscrowClient.createGame(
  GameType.GuessTheWord,
  0.1, // 0.1 SOL wager
  'word:bitcoin',
  wallet
);
```

## Security Considerations

1. **Audit**: These contracts should be audited before mainnet deployment
2. **Multisig**: Use a multisig wallet for the authority/treasury
3. **Rate Limits**: Implement rate limiting in the frontend
4. **Monitoring**: Set up monitoring for on-chain events

## Contract Addresses

After deployment, update these in your frontend:
- Game Escrow Program: `[DEPLOYED_ADDRESS]`
- Tipping Program: `[DEPLOYED_ADDRESS]`
- Treasury: `[TREASURY_ADDRESS]`

## Upgrade Path

To upgrade contracts:
1. Deploy new version
2. Migrate state if needed
3. Update frontend to use new program IDs
4. Deprecate old contracts

## Support

For issues or questions:
- Discord: [Your Discord]
- GitHub Issues: [Your Repo]