# Frontend Smart Contract Integration Guide

## Quick Start

### 1. Run Setup Script
```bash
./scripts/setup-anchor.sh
```

### 2. Deploy Contracts to Devnet
```bash
cd korus-contracts
anchor deploy --provider.cluster devnet
npx ts-node scripts/deploy.ts
```

### 3. Update Frontend Configuration

After deployment, update `/utils/contracts/contractConfig.ts`:
```typescript
export const CONTRACT_ADDRESSES = {
  devnet: {
    gameEscrow: 'YOUR_DEPLOYED_GAME_ESCROW_ADDRESS',
    tipping: 'YOUR_DEPLOYED_TIPPING_ADDRESS',
    treasury: 'YOUR_TREASURY_ADDRESS',
  },
  // ...
};
```

### 4. Copy IDL Files
```bash
cp korus-contracts/target/idl/*.json utils/contracts/idl/
```

## Integration Points

### Game Creation with Smart Contract

Update `/components/GameSelectionModal.tsx`:
```typescript
import { gameEscrowClient } from '@/utils/contracts/gameEscrow';
import { config } from '@/config/environment';

// In handleCreateGame function:
if (config.smartContractsEnabled) {
  try {
    // Initialize client with wallet
    await gameEscrowClient.initialize(wallet);
    
    // Create on-chain game
    const txId = await gameEscrowClient.createGame(
      gameType,
      wagerAmount,
      gameData,
      wallet
    );
    
    // Wait for confirmation
    await connection.confirmTransaction(txId);
    
    // Then create in backend with txId
    await gameAPI.createGame({
      ...gameData,
      transactionId: txId,
    });
  } catch (error) {
    console.error('Failed to create on-chain game:', error);
    // Fallback to backend-only
  }
} else {
  // Current backend-only flow
}
```

### Tipping Integration

Update tip functionality:
```typescript
import { tippingClient } from '@/utils/contracts/tipping';

// In tip function:
if (config.smartContractsEnabled) {
  try {
    await tippingClient.initialize(wallet);
    
    const txId = await tippingClient.sendTip(
      recipientAddress,
      tipAmount,
      postId,
      wallet
    );
    
    // Record in backend
    await api.recordTip({
      transactionId: txId,
      // ...
    });
  } catch (error) {
    console.error('Failed to send on-chain tip:', error);
  }
}
```

## Testing Flow

### 1. Create Test Game
```bash
# In app
1. Connect wallet
2. Create game with 0.1 SOL wager
3. Check transaction on Solana Explorer
```

### 2. Join Test Game
```bash
# In another wallet/device
1. Connect different wallet
2. Join the game
3. Verify escrow holds both wagers
```

### 3. Complete Game
```bash
# Backend needs to call complete_game
# Or implement admin UI for testing
```

## Monitoring Transactions

### Devnet Explorer
```
https://explorer.solana.com/?cluster=devnet
```

### Check Program Logs
```bash
solana logs YOUR_PROGRAM_ID --url devnet
```

## Gradual Rollout Plan

### Phase 1: Backend Only (Current)
- Smart contracts deployed but not integrated
- All logic in backend
- Users unaware of contracts

### Phase 2: Shadow Mode
- Enable contracts for team testing
- Run both systems in parallel
- Compare results

### Phase 3: Beta Users
- Enable for 10% of users
- Monitor success rates
- Gather feedback

### Phase 4: Full Launch
- Enable for all users
- Remove backend escrow logic
- Fully decentralized

## Environment Variable Control

Add to `.env`:
```env
EXPO_PUBLIC_SMART_CONTRACTS_ENABLED=false
```

Then gradually enable:
```env
# Testing
EXPO_PUBLIC_SMART_CONTRACTS_ENABLED=true

# Production (when ready)
EXPO_PUBLIC_SMART_CONTRACTS_ENABLED=true
```

## Emergency Procedures

### If Contracts Fail:
1. Set `smartContractsEnabled: false` in config
2. Deploy app update
3. All transactions fall back to backend

### Contract Upgrade:
1. Deploy new version
2. Update program IDs
3. Migrate any stored state
4. Update frontend

## Support & Debugging

### Common Issues:
1. **"Program not found"** - Check program ID is correct
2. **"Insufficient funds"** - User needs more SOL
3. **"Transaction failed"** - Check logs for details

### Debug Commands:
```bash
# Check program exists
solana program show YOUR_PROGRAM_ID

# Check recent transactions
solana confirm -v TRANSACTION_ID

# Monitor real-time logs
solana logs | grep YOUR_PROGRAM_ID
```