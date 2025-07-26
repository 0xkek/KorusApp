# Korus Smart Contracts Integration Guide

## Overview
Two smart contracts ready for deployment:
1. **Korus Games** - P2P wagering with escrow
2. **Korus Events** - Ticketing with tier-based early access

## Revenue Model
- **Games**: 2% platform fee on all wagers
- **Events**: 5% platform fee on all ticket sales

## Events - Premium Early Access
- **Premium/Genesis users**: Can buy tickets immediately
- **Basic users**: Must wait 12 hours after premium sale starts
- This creates value for premium subscriptions

## Deployment Steps

### 1. Build Programs
```bash
cd solana-programs/korus-games
anchor build

cd ../korus-events
anchor build
```

### 2. Deploy to Devnet
```bash
anchor deploy --provider.cluster devnet
```

### 3. Frontend Integration

#### Games Example
```typescript
// Create a game challenge
const createGame = async (wagerAmount: number, gameType: 'CoinFlip' | 'RockPaperScissors') => {
  const gameId = Date.now(); // Simple ID generation
  
  const tx = await program.methods
    .initializeGame(new BN(gameId), new BN(wagerAmount), { [gameType]: {} })
    .accounts({
      game: gameAccount,
      escrowTokenAccount: escrowAccount,
      player1: wallet.publicKey,
      player1TokenAccount: player1Token,
      mint: ALLY_MINT,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
};
```

#### Events Example
```typescript
// Purchase tickets with tier check
const purchaseTickets = async (eventId: number, ticketCount: number) => {
  const userTier = user.tier === 'premium' ? { premium: {} } : { basic: {} };
  
  const tx = await program.methods
    .purchaseTickets(ticketCount, userTier)
    .accounts({
      event: eventAccount,
      eventEscrow: escrowAccount,
      registration: registrationAccount,
      buyer: wallet.publicKey,
      buyerTokenAccount: buyerToken,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
};
```

## Program IDs (After Deployment)
- Games: `GamesKorus11111111111111111111111111111111` (placeholder)
- Events: `EventsKorus1111111111111111111111111111111` (placeholder)

Update these with actual deployed program IDs.

## Testing Checklist
- [ ] Deploy both programs to devnet
- [ ] Test game creation and joining
- [ ] Test event creation with tier timing
- [ ] Verify premium users can buy early
- [ ] Verify basic users are blocked for 12 hours
- [ ] Test platform fee distribution
- [ ] Test event check-in functionality

## Security Notes
- All funds held in PDA-controlled escrow
- Platform fee accounts must be initialized
- Consider adding emergency pause functionality
- Add oracle for game result verification in production