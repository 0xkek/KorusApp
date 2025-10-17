# Blockchain Payout Fix - Root Cause Analysis

## Problem
Game payouts were failing with error:
```
AccountNotInitialized: player_game_state account expected but not found
Error Code: 3012
```

## Root Cause
**Player 2 was not calling the blockchain `join_game` instruction when joining wagered games.**

### What Should Happen (Correct Flow)

1. **Player 1 creates game:**
   - Frontend calls `useGameEscrow.createGame()`
   - This calls smart contract's `create_game_with_deposit` instruction
   - Creates: Game PDA, Player1 player_game_state PDA, Escrow PDA
   - Transfers wager to escrow via CPI
   - Backend registers game in database with `onChainGameId`

2. **Player 2 joins game:**
   - Frontend calls `useGameEscrow.joinGame(onChainGameId)`
   - This calls smart contract's `join_game` instruction
   - Creates: Player2 player_game_state PDA
   - Transfers wager to escrow via CPI
   - Backend updates database with player 2

3. **Game completes:**
   - Players make moves via database (tic-tac-toe, RPS, etc.)
   - When game ends, backend calls smart contract's `complete_game`
   - Smart contract requires BOTH player_game_state PDAs to exist
   - Distributes funds: winner gets pot minus 2% fee, fee goes to treasury

### What Was Happening (Bug)

Game ID 31 in the test had:
- Player 1 created game on-chain ✅
- Player 2 joined via DATABASE ONLY ❌ (skipped blockchain call)
- Game played and completed in database ✅
- Payout failed: player2_game_state didn't exist ❌

## Why Player 2's Blockchain Join Was Skipped

The frontend has the correct code at `/korus-web/src/components/games/GamesPage.tsx:186-194`:

```typescript
if (game.wager > 0 && game.onChainGameId) {
  // Join game on blockchain (deposits wager into escrow)
  const { signature } = await joinGame(parseInt(game.onChainGameId));
  // Then update backend with signature
  await gamesAPI.joinGame(game.id, { onChainTxSignature: signature }, token);
} else {
  // No wager - just join in backend
  await gamesAPI.joinGame(game.id, {}, token);
}
```

**Possible reasons the blockchain call was skipped:**
1. Test was done before this code was implemented
2. Test was done via direct API call instead of UI
3. Wallet wasn't connected properly
4. User rejected the transaction
5. Transaction failed silently

## Fixes Applied

### 1. Fixed Escrow PDA Derivation Bug
**File:** `/korus-backend/src/services/gameEscrowService.ts:127-129`

**Before:**
```typescript
const [escrowPda] = await PublicKey.findProgramAddress(
  [Buffer.from('escrow'), gameIdBuffer],  // ❌ WRONG
  GAME_ESCROW_PROGRAM_ID
);
```

**After:**
```typescript
const [escrowPda] = await PublicKey.findProgramAddress(
  [Buffer.from('escrow'), gamePda.toBuffer()],  // ✅ CORRECT
  GAME_ESCROW_PROGRAM_ID
);
```

This matches the smart contract's escrow PDA derivation:
```rust
seeds = [b"escrow", game.key().as_ref()]
```

### 2. Added Environment Loading
Ensured backend test scripts load `.env` file properly to use devnet RPC instead of mainnet.

## Current Status

✅ Root cause identified
✅ Escrow PDA derivation fixed
✅ Frontend has correct join_game integration
⏳ Need to test complete end-to-end flow with new game

## Testing Instructions

To test a complete game flow:

1. **Open frontend:** http://localhost:3000/games
2. **Connect wallet** (make sure you have devnet SOL)
3. **Create game:**
   - Click "Create Game"
   - Choose game type (e.g., Rock Paper Scissors)
   - Set wager (e.g., 0.01 SOL)
   - Click "Create" - this will prompt wallet to sign transaction
   - Wait for confirmation
4. **Join game (in separate browser/wallet):**
   - Open same page with different wallet
   - Find the waiting game
   - Click "Join" - this will prompt wallet to sign transaction
   - Wait for confirmation
5. **Play game:**
   - Make moves as both players
   - Complete the game
6. **Verify payout:**
   - Backend should automatically call `complete_game`
   - Check backend logs for transaction signature
   - Winner should receive SOL (wager * 2 * 0.98)
   - Treasury should receive 2% fee

## Smart Contract Account Structure

For reference, here's how accounts are structured:

```
State PDA: [b"state"]
├── authority: Pubkey
├── treasury: Pubkey
├── total_games: u64
└── ...

Game PDA: [b"game", game_id]
├── game_id: u64
├── player1: Pubkey
├── player2: Pubkey
├── wager_amount: u64
├── status: u8 (0=waiting, 1=active, 2=completed, 3=cancelled)
└── ...

Player Game State PDA: [b"player_game_state", player_pubkey, game_id]
├── player: Pubkey
├── current_game_id: Option<u64>
└── ...

Escrow PDA: [b"escrow", game_pda]
├── Holds SOL for the game
└── (Not an account struct, just a PDA that holds lamports)
```

## Key Takeaways

1. **Player 2 MUST call join_game on blockchain** for wagered games
2. **Frontend already has this implemented** - just needs to be used properly
3. **Backend cannot call join_game** - requires player's wallet signature
4. **Escrow PDA must use game PDA** as seed, not game ID bytes
5. **Always verify both player_game_state accounts exist** before completing game

## Next Steps

1. Test complete end-to-end flow with new game
2. Add validation to backend: check if player2_game_state exists before allowing game completion
3. Consider adding a database field to track whether player2 joined on-chain
4. Add better error messages when blockchain operations fail
