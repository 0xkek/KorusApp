# Korus Smart Contract Architecture

## Overview
Korus requires smart contracts to handle on-chain transactions for:
1. Game wagers and escrow
2. Content tipping
3. Revenue distribution

## Contract Structure

### 1. Korus Game Escrow Contract
Handles wagering for Guess the Word and Truth or Dare games.

**Key Features:**
- Create game with wager amount
- Join game (match wager)
- Hold funds in escrow during game
- Distribute winnings based on outcome
- Handle disputes/timeouts
- Platform fee collection (2-5%)

**State:**
```rust
pub struct Game {
    pub id: Pubkey,
    pub game_type: GameType,
    pub creator: Pubkey,
    pub opponent: Option<Pubkey>,
    pub wager_amount: u64,
    pub status: GameStatus,
    pub winner: Option<Pubkey>,
    pub created_at: i64,
    pub expires_at: i64,
}

pub enum GameType {
    GuessTheWord,
    TruthOrDare,
}

pub enum GameStatus {
    Open,
    Active,
    Completed,
    Disputed,
    Expired,
}
```

**Instructions:**
- `create_game(game_type, wager_amount)`
- `join_game(game_id)`
- `complete_game(game_id, winner)`
- `dispute_game(game_id, reason)`
- `claim_expired(game_id)`
- `withdraw_fees()`

### 2. Korus Tipping Contract
Handles direct tips between users for content.

**Key Features:**
- Send tips to content creators
- Track tip history
- Platform fee (1-2%)
- Batch tipping support

**State:**
```rust
pub struct TipRecord {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub post_id: String,
    pub timestamp: i64,
}
```

**Instructions:**
- `send_tip(recipient, amount, post_id)`
- `batch_tip(recipients, amounts, post_ids)`
- `get_tip_history(user)`

### 3. Korus Treasury Contract
Manages platform fees and revenue distribution.

**Key Features:**
- Collect platform fees
- Distribute to team/treasury
- Track metrics
- Emergency pause functionality

## Implementation Plan

### Phase 1: Development (Week 1-2)
1. Set up Anchor framework
2. Implement game escrow contract
3. Implement tipping contract
4. Write comprehensive tests
5. Security audit preparation

### Phase 2: Testing (Week 3)
1. Deploy to devnet
2. Integration testing with frontend
3. Stress testing
4. Fix any issues

### Phase 3: Audit & Deploy (Week 4)
1. Security audit (if budget allows)
2. Deploy to mainnet
3. Update frontend integration
4. Monitor initial transactions

## Technical Stack
- **Framework:** Anchor (Rust)
- **Testing:** Anchor test suite + TypeScript
- **Deployment:** Anchor CLI
- **Integration:** @solana/web3.js

## Security Considerations
1. **Reentrancy Protection:** Use Anchor's built-in protections
2. **Access Control:** Owner-only admin functions
3. **Timeout Handling:** Automatic refunds for expired games
4. **Fee Limits:** Max fee percentage caps
5. **Emergency Pause:** Circuit breaker for critical issues

## Estimated Costs
- Development: 2-4 weeks
- Audit: $10k-30k (optional but recommended)
- Deployment: ~5 SOL for program deployment
- Ongoing: Transaction fees only

## Integration with Current App

### Frontend Changes:
1. Add contract interaction utils
2. Update game creation flow
3. Update tipping flow
4. Add transaction confirmation UI

### Backend Changes:
1. Store program IDs
2. Verify on-chain transactions
3. Sync game states
4. Handle webhooks for events

## Alternative: Start Without Contracts
For immediate launch, consider:
1. **Custodial Wallet:** Backend manages funds (centralized but faster)
2. **Manual Escrow:** Team manually handles disputes
3. **Direct Transfers:** P2P SOL transfers without escrow

Then migrate to smart contracts in Phase 2.

## Next Steps
1. Decide on immediate launch strategy
2. If contracts needed now, start Anchor setup
3. If launching without, plan migration path
4. Budget for audit if handling real funds