use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

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
        Ok(())
    }

    pub fn create_game(
        ctx: Context<CreateGame>,
        game_type: GameType,
        wager_amount: u64,
    ) -> Result<()> {
        require!(
            wager_amount >= MINIMUM_WAGER && wager_amount <= MAXIMUM_WAGER,
            ErrorCode::InvalidWagerAmount
        );

        let game = &mut ctx.accounts.game;
        let state = &mut ctx.accounts.state;
        let player_tracker = &mut ctx.accounts.player_tracker;
        let clock = Clock::get()?;

        // Initialize tracker if first time
        if player_tracker.player == Pubkey::default() {
            player_tracker.player = ctx.accounts.player1.key();
            player_tracker.current_game = None;
            player_tracker.games_played = 0;
            player_tracker.games_won = 0;
            player_tracker.total_wagered = 0;
            player_tracker.total_won = 0;
        }

        // Check if player already has an active game (1 game limit)
        require!(
            player_tracker.current_game.is_none(),
            ErrorCode::AlreadyHasActiveGame
        );
        
        game.game_id = state.total_games;
        game.game_type = game_type;
        game.player1 = ctx.accounts.player1.key();
        game.player2 = Pubkey::default();
        game.wager_amount = wager_amount;
        game.status = GameStatus::Waiting;
        game.winner = Pubkey::default();
        game.last_move_time = clock.unix_timestamp;
        game.current_turn = ctx.accounts.player1.key();
        game.player1_deposited = wager_amount;
        game.player2_deposited = 0;

        // Transfer SOL from player1 to escrow PDA
        let ix = system_instruction::transfer(
            &ctx.accounts.player1.key(),
            &ctx.accounts.escrow.key(),
            wager_amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.player1.to_account_info(),
                ctx.accounts.escrow.to_account_info(),
            ],
        )?;

        state.total_games += 1;
        state.total_volume += wager_amount;
        
        // Update player tracker
        player_tracker.current_game = Some(game.key());
        player_tracker.total_wagered += wager_amount;

        emit!(GameCreated {
            game_id: game.game_id,
            player1: game.player1,
            wager_amount,
            game_type: game.game_type.clone(),
        });

        Ok(())
    }

    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let state = &mut ctx.accounts.state;
        let player2_tracker = &mut ctx.accounts.player2_tracker;
        let clock = Clock::get()?;

        // Initialize tracker if first time
        if player2_tracker.player == Pubkey::default() {
            player2_tracker.player = ctx.accounts.player2.key();
            player2_tracker.current_game = None;
            player2_tracker.games_played = 0;
            player2_tracker.games_won = 0;
            player2_tracker.total_wagered = 0;
            player2_tracker.total_won = 0;
        }

        // Check if player2 already has an active game (1 game limit)
        require!(
            player2_tracker.current_game.is_none(),
            ErrorCode::AlreadyHasActiveGame
        );

        require!(game.status == GameStatus::Waiting, ErrorCode::GameNotWaiting);
        require!(game.player2 == Pubkey::default(), ErrorCode::GameAlreadyJoined);
        require!(game.player1 != ctx.accounts.player2.key(), ErrorCode::CannotJoinOwnGame);

        game.player2 = ctx.accounts.player2.key();
        game.status = GameStatus::Active;
        game.last_move_time = clock.unix_timestamp;
        game.player2_deposited = game.wager_amount;

        // Transfer SOL from player2 to escrow PDA
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

        state.total_volume += game.wager_amount;
        
        // Update player2 tracker
        player2_tracker.current_game = Some(game.key());
        player2_tracker.total_wagered += game.wager_amount;

        emit!(GameJoined {
            game_id: game.game_id,
            player2: ctx.accounts.player2.key(),
        });

        Ok(())
    }

    pub fn cancel_game(ctx: Context<CancelGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let player1_tracker = &mut ctx.accounts.player1_tracker;
        
        require!(game.status == GameStatus::Waiting, ErrorCode::GameNotWaiting);
        require!(game.player1 == ctx.accounts.player1.key(), ErrorCode::NotGameCreator);

        game.status = GameStatus::Cancelled;
        
        // Clear player's current game
        player1_tracker.current_game = None;

        // Refund player1 using PDA signer
        let game_key = game.key();
        let seeds = &[
            b"escrow",
            game_key.as_ref(),
            &[ctx.bumps.escrow],
        ];
        let signer_seeds = &[&seeds[..]];
        
        // Transfer SOL back from escrow to player1
        let ix = system_instruction::transfer(
            &ctx.accounts.escrow.key(),
            &ctx.accounts.player1.key(),
            game.player1_deposited,
        );
        
        anchor_lang::solana_program::program::invoke_signed(
            &ix,
            &[
                ctx.accounts.escrow.to_account_info(),
                ctx.accounts.player1.to_account_info(),
            ],
            signer_seeds,
        )?;

        emit!(GameCancelled {
            game_id: game.game_id,
            refund_amount: game.player1_deposited,
        });

        Ok(())
    }

    pub fn complete_game(ctx: Context<CompleteGame>, winner: Pubkey) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let state = &ctx.accounts.state;

        require!(game.status == GameStatus::Active, ErrorCode::GameNotActive);
        require!(
            winner == game.player1 || winner == game.player2,
            ErrorCode::InvalidWinner
        );

        game.status = GameStatus::Completed;
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
            &ctx.accounts.treasury.key(),
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

        // Transfer winnings to winner
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

        // Clear player trackers - they can now start new games
        ctx.accounts.player1_tracker.current_game = None;
        ctx.accounts.player2_tracker.current_game = None;

        // Update stats
        if winner == game.player1 {
            ctx.accounts.player1_tracker.games_won += 1;
            ctx.accounts.player1_tracker.total_won += winner_amount;
        } else {
            ctx.accounts.player2_tracker.games_won += 1;
            ctx.accounts.player2_tracker.total_won += winner_amount;
        }

        emit!(GameCompleted {
            game_id: game.game_id,
            winner,
            winner_amount,
            platform_fee,
        });

        Ok(())
    }

    pub fn claim_timeout_win(ctx: Context<ClaimTimeoutWin>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let state = &ctx.accounts.state;
        let clock = Clock::get()?;

        require!(game.status == GameStatus::Active, ErrorCode::GameNotActive);
        
        // Check if timeout has occurred (10 minutes since last move)
        let time_since_last_move = clock.unix_timestamp - game.last_move_time;
        require!(
            time_since_last_move > MOVE_TIMEOUT_SECONDS,
            ErrorCode::TimeoutNotReached
        );

        // Winner is the player who is NOT supposed to make the current move
        let winner = if game.current_turn == game.player1 {
            game.player2
        } else {
            game.player1
        };

        game.status = GameStatus::Completed;
        game.winner = winner;

        // Calculate amounts (same as complete_game)
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
            &ctx.accounts.treasury.key(),
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

        // Transfer winnings to winner
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

        // Clear player trackers - they can now start new games
        ctx.accounts.player1_tracker.current_game = None;
        ctx.accounts.player2_tracker.current_game = None;

        // Update stats
        if winner == game.player1 {
            ctx.accounts.player1_tracker.games_won += 1;
            ctx.accounts.player1_tracker.total_won += winner_amount;
        } else {
            ctx.accounts.player2_tracker.games_won += 1;
            ctx.accounts.player2_tracker.total_won += winner_amount;
        }

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

        require!(game.status == GameStatus::Active, ErrorCode::GameNotActive);
        
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
}

impl State {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 2;
}

#[account]
pub struct PlayerGameTracker {
    pub player: Pubkey,
    pub current_game: Option<Pubkey>, // None if no active game
    pub games_played: u64,
    pub games_won: u64,
    pub total_wagered: u64,
    pub total_won: u64,
}

impl PlayerGameTracker {
    pub const LEN: usize = 32 + 33 + 8 + 8 + 8 + 8;
}

#[account]
pub struct Game {
    pub game_id: u64,
    pub game_type: GameType,
    pub player1: Pubkey,
    pub player2: Pubkey,
    pub wager_amount: u64,
    pub status: GameStatus,
    pub winner: Pubkey,
    pub last_move_time: i64,
    pub current_turn: Pubkey,
    pub player1_deposited: u64,
    pub player2_deposited: u64,
}

impl Game {
    pub const LEN: usize = 8 + 1 + 32 + 32 + 8 + 1 + 32 + 8 + 32 + 8 + 8;
}

// Enums
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum GameType {
    TicTacToe,
    RockPaperScissors,
    ConnectFour,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum GameStatus {
    Waiting,
    Active,
    Completed,
    Cancelled,
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
        space = 8 + PlayerGameTracker::LEN,
        seeds = [b"player_tracker", player1.key().as_ref()],
        bump
    )]
    pub player_tracker: Account<'info, PlayerGameTracker>,
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
pub struct JoinGame<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(
        init_if_needed,
        payer = player2,
        space = 8 + PlayerGameTracker::LEN,
        seeds = [b"player_tracker", player2.key().as_ref()],
        bump
    )]
    pub player2_tracker: Account<'info, PlayerGameTracker>,
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
    pub game: Account<'info, Game>,
    #[account(
        mut,
        seeds = [b"player_tracker", player1.key().as_ref()],
        bump
    )]
    pub player1_tracker: Account<'info, PlayerGameTracker>,
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
        seeds = [b"player_tracker", game.player1.as_ref()],
        bump
    )]
    pub player1_tracker: Account<'info, PlayerGameTracker>,
    #[account(
        mut,
        seeds = [b"player_tracker", game.player2.as_ref()],
        bump
    )]
    pub player2_tracker: Account<'info, PlayerGameTracker>,
    /// CHECK: Escrow PDA that holds SOL
    #[account(
        mut,
        seeds = [b"escrow", game.key().as_ref()],
        bump
    )]
    pub escrow: AccountInfo<'info>,
    /// CHECK: Treasury account
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
        seeds = [b"player_tracker", game.player1.as_ref()],
        bump
    )]
    pub player1_tracker: Account<'info, PlayerGameTracker>,
    #[account(
        mut,
        seeds = [b"player_tracker", game.player2.as_ref()],
        bump
    )]
    pub player2_tracker: Account<'info, PlayerGameTracker>,
    /// CHECK: Escrow PDA that holds SOL
    #[account(
        mut,
        seeds = [b"escrow", game.key().as_ref()],
        bump
    )]
    pub escrow: AccountInfo<'info>,
    /// CHECK: Treasury account
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
    pub game_type: GameType,
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
    pub winner: Pubkey,
    pub winner_amount: u64,
    pub platform_fee: u64,
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
    #[msg("Timeout not reached")]
    TimeoutNotReached,
    #[msg("Player already has an active game")]
    AlreadyHasActiveGame,
}