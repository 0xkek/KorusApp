# Smart Contract Fix Plan

## Difficulty: Medium (2-3 hours)

## Current Problem
The contract uses CPI to transfer SOL, which causes wallet simulation failures:
```rust
// Current problematic code
invoke(
    &system_instruction::transfer(
        &ctx.accounts.player.key(),
        &ctx.accounts.escrow.key(),
        wager_amount,
    ),
    // ... this fails in wallets
)
```

## Solution: Two-Step Approach

### Option A: Remove CPI, Require Pre-funding (EASIEST - 30 mins)
```rust
pub fn create_game(ctx: Context<CreateGame>, game_type: u8) -> Result<()> {
    // Don't transfer SOL in contract
    // Just verify escrow has funds
    let escrow_balance = ctx.accounts.escrow.lamports();
    require!(escrow_balance >= WAGER_AMOUNT, ErrorCode::InsufficientFunds);

    // Create game
    let game = &mut ctx.accounts.game;
    game.player1 = ctx.accounts.player.key();
    game.wager_amount = WAGER_AMOUNT;
    game.status = GameStatus::Waiting;
    game.created_at = Clock::get()?.unix_timestamp;

    Ok(())
}

pub fn cancel_game(ctx: Context<CancelGame>) -> Result<()> {
    let game = &ctx.accounts.game;

    // Only creator can cancel
    require!(game.player1 == ctx.accounts.player.key(), ErrorCode::Unauthorized);
    require!(game.status == GameStatus::Waiting, ErrorCode::InvalidStatus);

    // Mark as cancelled (refund happens off-chain)
    game.status = GameStatus::Cancelled;

    Ok(())
}
```

### Option B: Use PDA Signer Pattern (BETTER - 2 hours)
```rust
pub fn create_game(ctx: Context<CreateGame>, game_type: u8, wager: u64) -> Result<()> {
    // Store wager info but don't transfer
    let game = &mut ctx.accounts.game;
    game.player1 = ctx.accounts.player.key();
    game.wager_amount = wager;
    game.status = GameStatus::Waiting;
    game.expires_at = Clock::get()?.unix_timestamp + 86400; // 24 hours

    Ok(())
}

pub fn claim_expired(ctx: Context<ClaimExpired>) -> Result<()> {
    let game = &ctx.accounts.game;
    let now = Clock::get()?.unix_timestamp;

    // Check if expired
    require!(now > game.expires_at, ErrorCode::NotExpired);
    require!(game.status == GameStatus::Waiting, ErrorCode::InvalidStatus);

    // Transfer from escrow PDA back to player1
    let escrow_bump = ctx.bumps.escrow;
    let seeds = &[
        b"escrow",
        game.key().as_ref(),
        &[escrow_bump],
    ];
    let signer_seeds = &[&seeds[..]];

    // This works because PDA signs for itself
    invoke_signed(
        &system_instruction::transfer(
            &ctx.accounts.escrow.key(),
            &ctx.accounts.player1.key(),
            game.wager_amount,
        ),
        &[
            ctx.accounts.escrow.to_account_info(),
            ctx.accounts.player1.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
        signer_seeds,
    )?;

    game.status = GameStatus::Expired;
    Ok(())
}
```

## Implementation Steps

1. **Update Contract** (1 hour)
   - Remove CPI from create_game
   - Add cancel_game function
   - Add expire_game function
   - Add timeout field to game state

2. **Deploy to Devnet** (30 mins)
   ```bash
   cd korus-contracts
   anchor build
   anchor deploy --provider.cluster devnet
   ```

3. **Update Frontend** (30 mins)
   - Keep direct transfer for funding
   - Call create_game after transfer
   - Add cancel button that calls cancel_game
   - Add auto-expire check

4. **Test** (30 mins)
   - Create game with wager
   - Cancel before anyone joins
   - Let game expire
   - Verify refunds work

## Why This Works

1. **No CPI on Create** = No wallet rejection
2. **PDA Controls Escrow** = Can refund programmatically
3. **Timeout Protection** = Funds never stuck
4. **Cancel Option** = User can get refund anytime

## Code Changes Needed

### 1. Contract (`lib.rs`):
- Remove transfer from create_game
- Add cancel_game instruction
- Add claim_expired instruction
- Add expiry timestamp to game state

### 2. Frontend (`gameEscrowDirect.ts`):
- Keep direct transfer
- Call create_game after transfer succeeds
- Add cancelGame function
- Add claimExpired function

### 3. Backend:
- Add cron job to check expired games
- Call claim_expired for old games

## Total Effort: 2-3 hours
- 1 hour: Contract changes
- 30 mins: Deploy and test
- 30 mins: Frontend updates
- 30 mins: Backend cron job
- 30 mins: Testing

This is definitely doable and would solve all your issues!