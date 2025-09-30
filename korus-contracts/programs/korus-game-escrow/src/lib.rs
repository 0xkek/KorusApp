use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;

declare_id!("4iUdAkPRmZLzUFXTLpt5QPGmUUtP6yfgpPpF3sLD9xtd");

const PLATFORM_FEE_BPS: u16 = 200; // 2% platform fee
const MINIMUM_WAGER: u64 = 10_000_000; // 0.01 SOL minimum
const MAXIMUM_WAGER: u64 = 1_000_000_000; // 1 SOL maximum
const MOVE_TIMEOUT_SECONDS: i64 = 600; // 10 minutes per move

#[program]
pub mod korus_game_escrow {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, treasury: Pubkey) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.authority = ctx.accounts.authority.key();
        state.treasury = treasury;
        state.total_games = 0;
        state.total_volume = 0;
        state.platform_fee_bps = PLATFORM_FEE_BPS;
        state.active_games = 0;
        Ok(())
    }

    pub fn create_game(
        ctx: Context<CreateGame>,
        game_type: u8,
        wager_amount: u64,
    ) -> Result<()> {
        require!(
            wager_amount >= MINIMUM_WAGER && wager_amount <= MAXIMUM_WAGER,
            ErrorCode::InvalidWagerAmount
        );

        // Check if player already has an active game
        let player_state = &ctx.accounts.player_state;
        require!(
            !player_state.has_active_game,
            ErrorCode::PlayerAlreadyInGame
        );

        let state = &mut ctx.accounts.state;
        let game = &mut ctx.accounts.game;
        let clock = Clock::get()?;

        game.game_id = state.total_games;
        game.game_type = game_type;
        game.player1 = ctx.accounts.player1.key();
        game.player2 = Pubkey::default();
        game.wager_amount = wager_amount;
        game.status = 0; // Waiting
        game.winner = Pubkey::default();
        game.player1_deposited = wager_amount;
        game.player2_deposited = 0;
        game.created_at = clock.unix_timestamp;
        game.last_move_time = clock.unix_timestamp;
        game.current_turn = ctx.accounts.player1.key();

        // NO CPI! The transfer happens directly in the transaction
        // The escrow account receives SOL via the transaction's SystemProgram.transfer
        // We just verify the escrow has received the funds
        let escrow_balance = ctx.accounts.escrow.lamports();
        require!(
            escrow_balance >= wager_amount,
            ErrorCode::InsufficientEscrowBalance
        );

        // Update player state
        let player_state = &mut ctx.accounts.player_state;
        player_state.player = ctx.accounts.player1.key();
        player_state.has_active_game = true;
        player_state.current_game_id = Some(state.total_games);

        state.total_games += 1;
        state.total_volume += wager_amount;
        state.active_games += 1;

        emit!(GameCreated {
            game_id: game.game_id,
            player1: game.player1,
            wager_amount,
            game_type,
        });

        Ok(())
    }

    pub fn create_game_with_deposit(
        ctx: Context<CreateGameWithDeposit>,
        game_type: u8,
        wager_amount: u64,
    ) -> Result<()> {
        require!(
            wager_amount >= MINIMUM_WAGER && wager_amount <= MAXIMUM_WAGER,
            ErrorCode::InvalidWagerAmount
        );

        // Check if player already has an active game
        let player_state = &ctx.accounts.player_state;
        require!(
            !player_state.has_active_game,
            ErrorCode::PlayerAlreadyInGame
        );

        let state = &mut ctx.accounts.state;
        let game = &mut ctx.accounts.game;
        let clock = Clock::get()?;

        game.game_id = state.total_games;
        game.game_type = game_type;
        game.player1 = ctx.accounts.player1.key();
        game.player2 = Pubkey::default();
        game.wager_amount = wager_amount;
        game.status = 0; // Waiting
        game.winner = Pubkey::default();
        game.player1_deposited = wager_amount;
        game.player2_deposited = 0;
        game.created_at = clock.unix_timestamp;
        game.last_move_time = clock.unix_timestamp;
        game.current_turn = ctx.accounts.player1.key();

        // No CPI transfer here - player deposits directly to escrow beforehand

        // Update player state
        let player_state = &mut ctx.accounts.player_state;
        player_state.player = ctx.accounts.player1.key();
        player_state.has_active_game = true;
        player_state.current_game_id = Some(state.total_games);

        state.total_games += 1;
        state.total_volume += wager_amount;
        state.active_games += 1;

        emit!(GameCreated {
            game_id: game.game_id,
            player1: game.player1,
            wager_amount,
            game_type,
        });

        Ok(())
    }

    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let clock = Clock::get()?;

        require!(game.status == 0, ErrorCode::GameNotWaiting);
        require!(game.player2 == Pubkey::default(), ErrorCode::GameAlreadyJoined);
        require!(game.player1 != ctx.accounts.player2.key(), ErrorCode::CannotJoinOwnGame);

        // Check if player2 already has an active game
        let player2_state = &ctx.accounts.player2_state;
        require!(
            !player2_state.has_active_game,
            ErrorCode::PlayerAlreadyInGame
        );

        game.player2 = ctx.accounts.player2.key();
        game.status = 1; // Active
        game.player2_deposited = game.wager_amount;
        game.last_move_time = clock.unix_timestamp;

        // Transfer SOL from player2 to escrow
        let ix = system_instruction::transfer(
            &ctx.accounts.player2.key(),
            &ctx.accounts.escrow.key(),
            game.wager_amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.player2.to_account_info(),
                ctx.accounts.escrow.to_account_info(),
            ],
        )?;

        // Update player2 state
        let player2_state = &mut ctx.accounts.player2_state;
        player2_state.player = ctx.accounts.player2.key();
        player2_state.has_active_game = true;
        player2_state.current_game_id = Some(game.game_id);

        let state = &mut ctx.accounts.state;
        state.total_volume += game.wager_amount;

        emit!(GameJoined {
            game_id: game.game_id,
            player2: game.player2,
        });

        Ok(())
    }

    pub fn cancel_game(ctx: Context<CancelGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        
        // Only player1 can cancel and only if waiting for player2
        require!(game.status == 0, ErrorCode::GameNotWaiting);
        require!(game.player1 == ctx.accounts.player1.key(), ErrorCode::NotGameCreator);

        game.status = 3; // Cancelled

        // Refund player1
        let game_key = game.key();
        let seeds = &[
            b"escrow",
            game_key.as_ref(),
            &[ctx.bumps.escrow],
        ];
        let signer_seeds = &[&seeds[..]];

        let refund_ix = system_instruction::transfer(
            &ctx.accounts.escrow.key(),
            &ctx.accounts.player1.key(),
            game.player1_deposited,
        );
        anchor_lang::solana_program::program::invoke_signed(
            &refund_ix,
            &[
                ctx.accounts.escrow.to_account_info(),
                ctx.accounts.player1.to_account_info(),
            ],
            signer_seeds,
        )?;

        // Update player state
        let player_state = &mut ctx.accounts.player_state;
        player_state.has_active_game = false;
        player_state.current_game_id = None;

        // Update global state
        let state = &mut ctx.accounts.state;
        state.active_games = state.active_games.saturating_sub(1);

        emit!(GameCancelled {
            game_id: game.game_id,
            refund_amount: game.player1_deposited,
        });

        Ok(())
    }

    pub fn complete_game(ctx: Context<CompleteGame>, winner: Option<Pubkey>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let state = &mut ctx.accounts.state;

        require!(game.status == 1, ErrorCode::GameNotActive);

        // If winner is provided, verify it's one of the players
        if let Some(winner_pubkey) = winner {
            require!(
                winner_pubkey == game.player1 || winner_pubkey == game.player2,
                ErrorCode::InvalidWinner
            );
        }

        // CRITICAL SECURITY: Only the backend authority can complete games
        // This prevents players from declaring themselves winners
        require!(
            ctx.accounts.authority.key() == state.authority,
            ErrorCode::UnauthorizedCaller
        );

        // Prevent double completion
        require!(game.winner == Pubkey::default(), ErrorCode::GameAlreadyCompleted);

        game.status = 2; // Completed
        game.winner = winner.unwrap_or(Pubkey::default()); // Default means draw

        // Calculate amounts
        let total_pot = game.player1_deposited + game.player2_deposited;
        let platform_fee = (total_pot * state.platform_fee_bps as u64) / 10000;

        // Handle draw vs winner payouts
        let (payout_player1, payout_player2) = if let Some(winner_pubkey) = winner {
            // Winner takes all (minus platform fee)
            let winner_amount = total_pot - platform_fee;
            if winner_pubkey == game.player1 {
                (winner_amount, 0u64)
            } else {
                (0u64, winner_amount)
            }
        } else {
            // Draw: split pot equally (minus platform fee)
            let remaining = total_pot - platform_fee;
            let half = remaining / 2;
            (half, remaining - half) // Handle odd amounts
        };

        // PDA signer seeds for escrow
        let game_key = game.key();
        let seeds = &[
            b"escrow",
            game_key.as_ref(),
            &[ctx.bumps.escrow],
        ];
        let signer_seeds = &[&seeds[..]];

        // Transfer platform fee to treasury
        let fee_ix = system_instruction::transfer(
            &ctx.accounts.escrow.key(),
            &state.treasury,
            platform_fee,
        );
        anchor_lang::solana_program::program::invoke_signed(
            &fee_ix,
            &[
                ctx.accounts.escrow.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
            ],
            signer_seeds,
        )?;

        // Transfer payouts to players
        if payout_player1 > 0 {
            let player1_ix = system_instruction::transfer(
                &ctx.accounts.escrow.key(),
                &ctx.accounts.player1.key(),
                payout_player1,
            );
            anchor_lang::solana_program::program::invoke_signed(
                &player1_ix,
                &[
                    ctx.accounts.escrow.to_account_info(),
                    ctx.accounts.player1.to_account_info(),
                ],
                signer_seeds,
            )?;
        }

        if payout_player2 > 0 {
            let player2_ix = system_instruction::transfer(
                &ctx.accounts.escrow.key(),
                &ctx.accounts.player2.key(),
                payout_player2,
            );
            anchor_lang::solana_program::program::invoke_signed(
                &player2_ix,
                &[
                    ctx.accounts.escrow.to_account_info(),
                    ctx.accounts.player2.to_account_info(),
                ],
                signer_seeds,
            )?;
        }

        // Update player states
        ctx.accounts.player1_state.has_active_game = false;
        ctx.accounts.player1_state.current_game_id = None;
        ctx.accounts.player2_state.has_active_game = false;
        ctx.accounts.player2_state.current_game_id = None;

        // Update global state
        state.active_games = state.active_games.saturating_sub(1);

        emit!(GameCompleted {
            game_id: game.game_id,
            winner,
            player1_payout: payout_player1,
            player2_payout: payout_player2,
            platform_fee,
            is_draw: winner.is_none(),
        });

        Ok(())
    }

    pub fn claim_timeout_win(ctx: Context<ClaimTimeoutWin>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let state = &mut ctx.accounts.state;
        let clock = Clock::get()?;

        require!(game.status == 1, ErrorCode::GameNotActive);

        // Check if timeout has occurred (10 minutes since last move)
        let time_since_last_move = clock.unix_timestamp - game.last_move_time;
        require!(
            time_since_last_move > MOVE_TIMEOUT_SECONDS,
            ErrorCode::TimeoutNotReached
        );

        // Claimer must be one of the players
        let claimer = ctx.accounts.claimer.key();
        require!(
            claimer == game.player1 || claimer == game.player2,
            ErrorCode::NotAPlayer
        );

        // Winner is the player who is NOT supposed to make the current move
        // (The player whose turn it is has timed out)
        let winner = if game.current_turn == game.player1 {
            game.player2
        } else {
            game.player1
        };

        // Only the non-timed-out player can claim
        require!(claimer == winner, ErrorCode::CannotClaimOwnTimeout);

        game.status = 2; // Completed
        game.winner = winner;

        // Calculate amounts
        let total_pot = game.player1_deposited + game.player2_deposited;
        let platform_fee = (total_pot * state.platform_fee_bps as u64) / 10000;
        let winner_amount = total_pot - platform_fee;

        // PDA signer seeds for escrow
        let game_key = game.key();
        let seeds = &[
            b"escrow",
            game_key.as_ref(),
            &[ctx.bumps.escrow],
        ];
        let signer_seeds = &[&seeds[..]];

        // Transfer platform fee to treasury
        let fee_ix = system_instruction::transfer(
            &ctx.accounts.escrow.key(),
            &state.treasury,
            platform_fee,
        );
        anchor_lang::solana_program::program::invoke_signed(
            &fee_ix,
            &[
                ctx.accounts.escrow.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
            ],
            signer_seeds,
        )?;

        // Transfer winnings to winner (timeout always has a winner, no draw)
        let winner_account = if winner == game.player1 {
            ctx.accounts.player1.key()
        } else {
            ctx.accounts.player2.key()
        };

        let winner_ix = system_instruction::transfer(
            &ctx.accounts.escrow.key(),
            &winner_account,
            winner_amount,
        );
        anchor_lang::solana_program::program::invoke_signed(
            &winner_ix,
            &[
                ctx.accounts.escrow.to_account_info(),
                if winner == game.player1 {
                    ctx.accounts.player1.to_account_info()
                } else {
                    ctx.accounts.player2.to_account_info()
                },
            ],
            signer_seeds,
        )?;

        // Update player states
        ctx.accounts.player1_state.has_active_game = false;
        ctx.accounts.player1_state.current_game_id = None;
        ctx.accounts.player2_state.has_active_game = false;
        ctx.accounts.player2_state.current_game_id = None;

        // Update global state
        state.active_games = state.active_games.saturating_sub(1);

        emit!(GameTimeout {
            game_id: game.game_id,
            winner,
            winner_amount,
            platform_fee,
        });

        Ok(())
    }

    pub fn update_move_time(ctx: Context<UpdateMoveTime>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let clock = Clock::get()?;

        require!(game.status == 1, ErrorCode::GameNotActive);
        
        // Only the current player can update (after making their move)
        require!(
            ctx.accounts.player.key() == game.current_turn,
            ErrorCode::NotYourTurn
        );

        // Update last move time and switch turns
        game.last_move_time = clock.unix_timestamp;
        game.current_turn = if game.current_turn == game.player1 {
            game.player2
        } else {
            game.player1
        };

        Ok(())
    }
}

// Account structures
#[account]
pub struct State {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub total_games: u64,
    pub total_volume: u64,
    pub platform_fee_bps: u16,
    pub active_games: u64,
}

impl State {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 2 + 8;
}

#[account]
pub struct Game {
    pub game_id: u64,
    pub game_type: u8,
    pub player1: Pubkey,
    pub player2: Pubkey,
    pub wager_amount: u64,
    pub status: u8, // 0: Waiting, 1: Active, 2: Completed, 3: Cancelled
    pub winner: Pubkey,
    pub player1_deposited: u64,
    pub player2_deposited: u64,
    pub created_at: i64,
    pub last_move_time: i64,
    pub current_turn: Pubkey,
}

impl Game {
    pub const LEN: usize = 8 + 1 + 32 + 32 + 8 + 1 + 32 + 8 + 8 + 8 + 8 + 32;
}

#[account]
pub struct PlayerState {
    pub player: Pubkey,
    pub has_active_game: bool,
    pub current_game_id: Option<u64>,
}

impl PlayerState {
    pub const LEN: usize = 32 + 1 + 9; // Option<u64> = 1 + 8
}

// Contexts
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + State::LEN,
        seeds = [b"state"],
        bump
    )]
    pub state: Account<'info, State>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateGame<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,
    #[account(
        init,
        payer = player1,
        space = 8 + Game::LEN,
        seeds = [b"game", state.total_games.to_le_bytes().as_ref()],
        bump
    )]
    pub game: Account<'info, Game>,
    #[account(
        init_if_needed,
        payer = player1,
        space = 8 + PlayerState::LEN,
        seeds = [b"player", player1.key().as_ref()],
        bump
    )]
    pub player_state: Account<'info, PlayerState>,
    /// CHECK: Escrow PDA that holds SOL
    #[account(
        mut,
        seeds = [b"escrow", game.key().as_ref()],
        bump
    )]
    pub escrow: AccountInfo<'info>,
    #[account(mut)]
    pub player1: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateGameWithDeposit<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,
    #[account(
        init,
        payer = player1,
        space = 8 + Game::LEN,
        seeds = [b"game", state.total_games.to_le_bytes().as_ref()],
        bump
    )]
    pub game: Account<'info, Game>,
    #[account(
        init_if_needed,
        payer = player1,
        space = 8 + PlayerState::LEN,
        seeds = [b"player", player1.key().as_ref()],
        bump
    )]
    pub player_state: Account<'info, PlayerState>,
    /// CHECK: Escrow PDA that holds SOL (player should have already deposited)
    #[account(
        mut,
        seeds = [b"escrow", game.key().as_ref()],
        bump
    )]
    pub escrow: AccountInfo<'info>,
    #[account(mut)]
    pub player1: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(
        init_if_needed,
        payer = player2,
        space = 8 + PlayerState::LEN,
        seeds = [b"player", player2.key().as_ref()],
        bump
    )]
    pub player2_state: Account<'info, PlayerState>,
    /// CHECK: Escrow PDA that holds SOL
    #[account(
        mut,
        seeds = [b"escrow", game.key().as_ref()],
        bump
    )]
    pub escrow: AccountInfo<'info>,
    #[account(mut)]
    pub player2: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelGame<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(
        mut,
        seeds = [b"player", player1.key().as_ref()],
        bump
    )]
    pub player_state: Account<'info, PlayerState>,
    /// CHECK: Escrow PDA that holds SOL
    #[account(
        mut,
        seeds = [b"escrow", game.key().as_ref()],
        bump
    )]
    pub escrow: AccountInfo<'info>,
    #[account(mut)]
    pub player1: Signer<'info>,
}

#[derive(Accounts)]
pub struct CompleteGame<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(
        mut,
        seeds = [b"player", game.player1.as_ref()],
        bump
    )]
    pub player1_state: Account<'info, PlayerState>,
    #[account(
        mut,
        seeds = [b"player", game.player2.as_ref()],
        bump
    )]
    pub player2_state: Account<'info, PlayerState>,
    /// CHECK: Escrow PDA that holds SOL
    #[account(
        mut,
        seeds = [b"escrow", game.key().as_ref()],
        bump
    )]
    pub escrow: AccountInfo<'info>,
    /// CHECK: Treasury account (validated in instruction)
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    /// CHECK: Player 1 account
    #[account(mut)]
    pub player1: AccountInfo<'info>,
    /// CHECK: Player 2 account
    #[account(mut)]
    pub player2: AccountInfo<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimTimeoutWin<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(
        mut,
        seeds = [b"player", game.player1.as_ref()],
        bump
    )]
    pub player1_state: Account<'info, PlayerState>,
    #[account(
        mut,
        seeds = [b"player", game.player2.as_ref()],
        bump
    )]
    pub player2_state: Account<'info, PlayerState>,
    /// CHECK: Escrow PDA that holds SOL
    #[account(
        mut,
        seeds = [b"escrow", game.key().as_ref()],
        bump
    )]
    pub escrow: AccountInfo<'info>,
    /// CHECK: Treasury account (from state)
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    /// CHECK: Player 1 account
    #[account(mut)]
    pub player1: AccountInfo<'info>,
    /// CHECK: Player 2 account
    #[account(mut)]
    pub player2: AccountInfo<'info>,
    pub claimer: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateMoveTime<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub player: Signer<'info>,
}

// Events
#[event]
pub struct GameCreated {
    pub game_id: u64,
    pub player1: Pubkey,
    pub wager_amount: u64,
    pub game_type: u8,
}

#[event]
pub struct GameJoined {
    pub game_id: u64,
    pub player2: Pubkey,
}

#[event]
pub struct GameCancelled {
    pub game_id: u64,
    pub refund_amount: u64,
}

#[event]
pub struct GameCompleted {
    pub game_id: u64,
    pub winner: Option<Pubkey>,
    pub player1_payout: u64,
    pub player2_payout: u64,
    pub platform_fee: u64,
    pub is_draw: bool,
}

#[event]
pub struct GameTimeout {
    pub game_id: u64,
    pub winner: Pubkey,
    pub winner_amount: u64,
    pub platform_fee: u64,
}

// Error codes
#[error_code]
pub enum ErrorCode {
    #[msg("Invalid wager amount")]
    InvalidWagerAmount,
    #[msg("Insufficient escrow balance")]
    InsufficientEscrowBalance,
    #[msg("Game is not waiting for players")]
    GameNotWaiting,
    #[msg("Game already has a second player")]
    GameAlreadyJoined,
    #[msg("Cannot join your own game")]
    CannotJoinOwnGame,
    #[msg("Not the game creator")]
    NotGameCreator,
    #[msg("Game is not active")]
    GameNotActive,
    #[msg("Invalid winner")]
    InvalidWinner,
    #[msg("Unauthorized caller")]
    UnauthorizedCaller,
    #[msg("Game already completed")]
    GameAlreadyCompleted,
    #[msg("Timeout not reached")]
    TimeoutNotReached,
    #[msg("Not a player in this game")]
    NotAPlayer,
    #[msg("Cannot claim your own timeout")]
    CannotClaimOwnTimeout,
    #[msg("Not your turn")]
    NotYourTurn,
    #[msg("Player already has an active game")]
    PlayerAlreadyInGame,
}