use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("GamesKorus11111111111111111111111111111111");

#[program]
pub mod korus_games {
    use super::*;

    /// Initialize a new game room
    pub fn initialize_game(
        ctx: Context<InitializeGame>,
        game_id: u64,
        wager_amount: u64,
        game_type: GameType,
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;
        game.game_id = game_id;
        game.player1 = ctx.accounts.player1.key();
        game.player2 = Pubkey::default();
        game.wager_amount = wager_amount;
        game.game_type = game_type;
        game.state = GameState::WaitingForPlayer2;
        game.winner = Pubkey::default();
        game.created_at = Clock::get()?.unix_timestamp;
        
        // Transfer wager from player1 to escrow
        let cpi_accounts = Transfer {
            from: ctx.accounts.player1_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.player1.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, wager_amount)?;
        
        emit!(GameCreated {
            game_id,
            player1: ctx.accounts.player1.key(),
            wager_amount,
            game_type,
        });
        
        Ok(())
    }

    /// Join an existing game
    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        
        require!(
            game.state == GameState::WaitingForPlayer2,
            GameError::GameNotOpen
        );
        
        require!(
            game.player1 != ctx.accounts.player2.key(),
            GameError::CannotPlayAgainstSelf
        );
        
        game.player2 = ctx.accounts.player2.key();
        game.state = GameState::InProgress;
        
        // Transfer wager from player2 to escrow
        let cpi_accounts = Transfer {
            from: ctx.accounts.player2_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.player2.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, game.wager_amount)?;
        
        emit!(PlayerJoined {
            game_id: game.game_id,
            player2: ctx.accounts.player2.key(),
        });
        
        Ok(())
    }

    /// Complete a game and distribute winnings
    pub fn complete_game(
        ctx: Context<CompleteGame>,
        winner: Pubkey,
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;
        
        require!(
            game.state == GameState::InProgress,
            GameError::GameNotInProgress
        );
        
        require!(
            winner == game.player1 || winner == game.player2,
            GameError::InvalidWinner
        );
        
        // Verify the caller is authorized (could be an oracle or admin)
        // For now, we'll allow either player to complete
        require!(
            ctx.accounts.authority.key() == game.player1 || 
            ctx.accounts.authority.key() == game.player2,
            GameError::UnauthorizedCaller
        );
        
        game.winner = winner;
        game.state = GameState::Completed;
        
        // Calculate winnings (winner gets 98%, 2% platform fee)
        let total_pot = game.wager_amount * 2;
        let platform_fee = total_pot * 2 / 100;
        let winner_amount = total_pot - platform_fee;
        
        // Transfer winnings to winner
        let seeds = &[
            b"escrow",
            game.game_id.to_le_bytes().as_ref(),
            &[ctx.bumps.escrow_token_account],
        ];
        let signer = &[&seeds[..]];
        
        let winner_token_account = if winner == game.player1 {
            ctx.accounts.player1_token_account.to_account_info()
        } else {
            ctx.accounts.player2_token_account.to_account_info()
        };
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: winner_token_account,
            authority: ctx.accounts.escrow_token_account.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, winner_amount)?;
        
        // Transfer platform fee
        let cpi_accounts_fee = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.platform_fee_account.to_account_info(),
            authority: ctx.accounts.escrow_token_account.to_account_info(),
        };
        let cpi_ctx_fee = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts_fee,
            signer
        );
        token::transfer(cpi_ctx_fee, platform_fee)?;
        
        emit!(GameCompleted {
            game_id: game.game_id,
            winner,
            winner_amount,
            platform_fee,
        });
        
        Ok(())
    }

    /// Cancel a game (only if no player2 has joined)
    pub fn cancel_game(ctx: Context<CancelGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        
        require!(
            game.state == GameState::WaitingForPlayer2,
            GameError::CannotCancelActiveGame
        );
        
        require!(
            ctx.accounts.player1.key() == game.player1,
            GameError::UnauthorizedCaller
        );
        
        game.state = GameState::Cancelled;
        
        // Refund wager to player1
        let seeds = &[
            b"escrow",
            game.game_id.to_le_bytes().as_ref(),
            &[ctx.bumps.escrow_token_account],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.player1_token_account.to_account_info(),
            authority: ctx.accounts.escrow_token_account.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, game.wager_amount)?;
        
        emit!(GameCancelled {
            game_id: game.game_id,
        });
        
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct InitializeGame<'info> {
    #[account(
        init,
        payer = player1,
        space = 8 + Game::INIT_SPACE,
        seeds = [b"game", game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game: Account<'info, Game>,
    
    #[account(
        init,
        payer = player1,
        token::mint = mint,
        token::authority = escrow_token_account,
        seeds = [b"escrow", game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub player1: Signer<'info>,
    
    #[account(
        mut,
        constraint = player1_token_account.owner == player1.key()
    )]
    pub player1_token_account: Account<'info, TokenAccount>,
    
    pub mint: Account<'info, token::Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(
        mut,
        seeds = [b"game", game.game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game: Account<'info, Game>,
    
    #[account(
        mut,
        seeds = [b"escrow", game.game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub player2: Signer<'info>,
    
    #[account(
        mut,
        constraint = player2_token_account.owner == player2.key()
    )]
    pub player2_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CompleteGame<'info> {
    #[account(
        mut,
        seeds = [b"game", game.game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game: Account<'info, Game>,
    
    #[account(
        mut,
        seeds = [b"escrow", game.game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    
    pub authority: Signer<'info>,
    
    #[account(mut)]
    pub player1_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub player2_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub platform_fee_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelGame<'info> {
    #[account(
        mut,
        seeds = [b"game", game.game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game: Account<'info, Game>,
    
    #[account(
        mut,
        seeds = [b"escrow", game.game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    
    pub player1: Signer<'info>,
    
    #[account(mut)]
    pub player1_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct Game {
    pub game_id: u64,
    pub player1: Pubkey,
    pub player2: Pubkey,
    pub wager_amount: u64,
    pub game_type: GameType,
    pub state: GameState,
    pub winner: Pubkey,
    pub created_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum GameType {
    CoinFlip,
    RockPaperScissors,
    DiceRoll,
    Custom,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum GameState {
    WaitingForPlayer2,
    InProgress,
    Completed,
    Cancelled,
}

#[error_code]
pub enum GameError {
    #[msg("Game is not open for joining")]
    GameNotOpen,
    #[msg("Cannot play against yourself")]
    CannotPlayAgainstSelf,
    #[msg("Game is not in progress")]
    GameNotInProgress,
    #[msg("Invalid winner specified")]
    InvalidWinner,
    #[msg("Unauthorized caller")]
    UnauthorizedCaller,
    #[msg("Cannot cancel an active game")]
    CannotCancelActiveGame,
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
pub struct PlayerJoined {
    pub game_id: u64,
    pub player2: Pubkey,
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
}