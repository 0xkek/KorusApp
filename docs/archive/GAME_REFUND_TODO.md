# Game Refund System TODO

## Problem
When a game is created but nobody joins, the wager is stuck in the escrow PDA with no way to recover it.

## Solutions Needed

### 1. Backend Timeout System
- Track game creation timestamps
- After 24 hours, if status is still "waiting":
  - Mark game as "expired" in database
  - Trigger refund transaction

### 2. Manual Cancel Button (Quick Fix)
Add a "Cancel Game" button that:
- Only shows for game creator
- Only when status is "waiting"
- Sends SOL back from escrow to creator

### 3. Contract Update (Best Solution)
Update the Solana program to:
- Include timeout mechanism
- Allow creator to cancel
- Automatically refund on expiration

## Temporary Manual Refund
If funds are stuck, you can manually refund using:

```javascript
// Manual refund script
const { Connection, Keypair, Transaction, SystemProgram, PublicKey } = require('@solana/web3.js');

async function refundStuckGame(escrowPda, creatorWallet, amount) {
  const connection = new Connection('https://api.devnet.solana.com');

  // Need authority keypair that controls the escrow
  // This would be the program's authority
  const refundTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(escrowPda),
      toPubkey: new PublicKey(creatorWallet),
      lamports: amount * 1e9
    })
  );

  // This won't work without proper authority
  // The escrow PDA is controlled by the program
}
```

## Current Stuck Funds
- Escrow PDA: `7MaowNLknp7TZTQrhQkHPmbwQYVumbbbv6d2MG4sETCr`
- Amount: 0.01 SOL
- Creator: `9ocv93TeuRq5iMyP6qXVnm9UY9zfM5L1zUaDnXcRoHtW`

## Priority Implementation
1. **Immediate**: Add backend expiration check
2. **Next Sprint**: Add cancel button in UI
3. **Long-term**: Update Solana program with proper game lifecycle