use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

const PLATFORM_FEE_BPS: u16 = 250; // 2.5% platform fee
const MINIMUM_WAGER: u64 = 100_000_000; // 0.1 SOL minimum
const MAXIMUM_WAGER: u64 = 10_000_000_000; // 10 SOL maximum
const GAME_EXPIRY_SECONDS: i64 = 86400; // 24 hours

#[program]
pub mod korus_game_escrow {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.authority = ctx.accounts.authority.key();
        state.treasury = ctx.accounts.treasury.key();
        state.total_games = 0;
        state.total_volume = 0;
        state.platform_fee_bps = PLATFORM_FEE_BPS;
        Ok(())
    }

    pub fn create_game(
        ctx: Context<CreateGame>,
        game_type: GameType,
        wager_amount: u64,
        game_data: String,
    ) -> Result<()> {
        require!(
            wager_amount >= MINIMUM_WAGER && wager_amount <= MAXIMUM_WAGER,
            ErrorCode::InvalidWagerAmount
        );
        require!(game_data.len() <= 256, ErrorCode::GameDataTooLong);

        let game = &mut ctx.accounts.game;
        let state = &mut ctx.accounts.state;
        let clock = Clock::get()?;

        game.id = state.total_games;
        game.game_type = game_type;
        game.creator = ctx.accounts.creator.key();
        game.opponent = None;
        game.wager_amount = wager_amount;
        game.status = GameStatus::Open;
        game.winner = None;
        game.game_data = game_data;
        game.created_at = clock.unix_timestamp;
        game.expires_at = clock.unix_timestamp + GAME_EXPIRY_SECONDS;
        game.escrow = ctx.accounts.escrow.key();

        // Transfer wager to escrow
        let cpi_accounts = Transfer {
            from: ctx.accounts.creator_ata.to_account_info(),
            to: ctx.accounts.escrow.to_account_info(),
            authority: ctx.accounts.creator.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, wager_amount)?;

        state.total_games += 1;
        state.total_volume += wager_amount;

        emit!(GameCreated {
            game_id: game.id,
            creator: game.creator,
            wager_amount,
            game_type: game.game_type.clone(),
        });

        Ok(())
    }

    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let clock = Clock::get()?;

        require!(game.status == GameStatus::Open, ErrorCode::GameNotOpen);
        require!(game.opponent.is_none(), ErrorCode::GameAlreadyJoined);
        require!(game.creator != ctx.accounts.opponent.key(), ErrorCode::CannotJoinOwnGame);
        require!(clock.unix_timestamp < game.expires_at, ErrorCode::GameExpired);

        game.opponent = Some(ctx.accounts.opponent.key());
        game.status = GameStatus::Active;

        // Transfer wager to escrow
        let cpi_accounts = Transfer {
            from: ctx.accounts.opponent_ata.to_account_info(),
            to: ctx.accounts.escrow.to_account_info(),
            authority: ctx.accounts.opponent.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, game.wager_amount)?;

        emit!(GameJoined {
            game_id: game.id,
            opponent: ctx.accounts.opponent.key(),
        });

        Ok(())
    }

    pub fn complete_game(ctx: Context<CompleteGame>, winner: Pubkey) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let state = &ctx.accounts.state;

        require!(game.status == GameStatus::Active, ErrorCode::GameNotActive);
        require!(
            winner == game.creator || winner == game.opponent.unwrap(),
            ErrorCode::InvalidWinner
        );

        game.status = GameStatus::Completed;
        game.winner = Some(winner);

        // Calculate amounts
        let total_pot = game.wager_amount * 2;
        let platform_fee = (total_pot * state.platform_fee_bps as u64) / 10000;
        let winner_amount = total_pot - platform_fee;

        // Transfer platform fee to treasury
        let seeds = &[
            b"escrow",
            game.key().as_ref(),
            &[ctx.bumps.escrow],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow.to_account_info(),
            to: ctx.accounts.treasury_ata.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, platform_fee)?;

        // Transfer winnings to winner
        let winner_ata = if winner == game.creator {
            ctx.accounts.creator_ata.to_account_info()
        } else {
            ctx.accounts.opponent_ata.to_account_info()
        };

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow.to_account_info(),
            to: winner_ata,
            authority: ctx.accounts.escrow.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, winner_amount)?;

        emit!(GameCompleted {
            game_id: game.id,
            winner,
            winner_amount,
            platform_fee,
        });

        Ok(())
    }

    pub fn cancel_expired_game(ctx: Context<CancelExpiredGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let clock = Clock::get()?;

        require!(game.status == GameStatus::Open, ErrorCode::GameNotOpen);
        require!(clock.unix_timestamp >= game.expires_at, ErrorCode::GameNotExpired);

        game.status = GameStatus::Expired;

        // Refund creator
        let seeds = &[
            b"escrow",
            game.key().as_ref(),
            &[ctx.bumps.escrow],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow.to_account_info(),
            to: ctx.accounts.creator_ata.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, game.wager_amount)?;

        emit!(GameCancelled {
            game_id: game.id,
            reason: "Expired".to_string(),
        });

        Ok(())
    }
}

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
    /// CHECK: Treasury account
    pub treasury: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateGame<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,
    #[account(
        init,
        payer = creator,
        space = 8 + Game::LEN,
        seeds = [b"game", state.total_games.to_le_bytes().as_ref()],
        bump
    )]
    pub game: Account<'info, Game>,
    #[account(
        init,
        payer = creator,
        token::mint = mint,
        token::authority = escrow,
        seeds = [b"escrow", game.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, TokenAccount>,
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(mut)]
    pub creator_ata: Account<'info, TokenAccount>,
    /// CHECK: Mint account
    pub mint: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub escrow: Account<'info, TokenAccount>,
    #[account(mut)]
    pub opponent: Signer<'info>,
    #[account(mut)]
    pub opponent_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CompleteGame<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub state: Account<'info, State>,
    #[account(
        mut,
        seeds = [b"escrow", game.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, TokenAccount>,
    /// CHECK: Authority to complete game (backend or arbiter)
    pub authority: Signer<'info>,
    #[account(mut)]
    pub creator_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub opponent_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub treasury_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelExpiredGame<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(
        mut,
        seeds = [b"escrow", game.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, TokenAccount>,
    #[account(mut)]
    pub creator_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

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
pub struct Game {
    pub id: u64,
    pub game_type: GameType,
    pub creator: Pubkey,
    pub opponent: Option<Pubkey>,
    pub wager_amount: u64,
    pub status: GameStatus,
    pub winner: Option<Pubkey>,
    pub game_data: String,
    pub created_at: i64,
    pub expires_at: i64,
    pub escrow: Pubkey,
}

impl Game {
    pub const LEN: usize = 8 + 1 + 32 + 33 + 8 + 1 + 33 + 256 + 8 + 8 + 32;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum GameType {
    GuessTheWord,
    TruthOrDare,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum GameStatus {
    Open,
    Active,
    Completed,
    Disputed,
    Expired,
}

#[event]
pub struct GameCreated {
    pub game_id: u64,
    pub creator: Pubkey,
    pub wager_amount: u64,
    pub game_type: GameType,
}

#[event]
pub struct GameJoined {
    pub game_id: u64,
    pub opponent: Pubkey,
}

#[event]
pub struct GameCompleted {
    pub game_id: u64,
    pub winner: Pubkey,
    pub winner_amount: u64,
    pub platform_fee: u64,
}

#[event]
pub struct GameCancelled {
    pub game_id: u64,
    pub reason: String,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid wager amount")]
    InvalidWagerAmount,
    #[msg("Game data too long")]
    GameDataTooLong,
    #[msg("Game is not open")]
    GameNotOpen,
    #[msg("Game already has an opponent")]
    GameAlreadyJoined,
    #[msg("Cannot join your own game")]
    CannotJoinOwnGame,
    #[msg("Game has expired")]
    GameExpired,
    #[msg("Game is not active")]
    GameNotActive,
    #[msg("Invalid winner")]
    InvalidWinner,
    #[msg("Game has not expired yet")]
    GameNotExpired,
}