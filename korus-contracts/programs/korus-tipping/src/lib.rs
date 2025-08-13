use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("Gf6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnT");

const PLATFORM_FEE_BPS: u16 = 100; // 1% platform fee for tips
const MINIMUM_TIP: u64 = 1_000_000; // 0.001 SOL minimum tip

#[program]
pub mod korus_tipping {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.authority = ctx.accounts.authority.key();
        state.treasury = ctx.accounts.treasury.key();
        state.total_tips = 0;
        state.total_volume = 0;
        state.platform_fee_bps = PLATFORM_FEE_BPS;
        Ok(())
    }

    pub fn send_tip(
        ctx: Context<SendTip>,
        amount: u64,
        post_id: String,
    ) -> Result<()> {
        require!(amount >= MINIMUM_TIP, ErrorCode::TipTooSmall);
        require!(post_id.len() <= 64, ErrorCode::PostIdTooLong);
        require!(
            ctx.accounts.sender.key() != ctx.accounts.recipient.key(),
            ErrorCode::CannotTipSelf
        );

        let state = &mut ctx.accounts.state;
        let tip_record = &mut ctx.accounts.tip_record;
        let clock = Clock::get()?;

        // Calculate fees
        let platform_fee = (amount * state.platform_fee_bps as u64) / 10000;
        let recipient_amount = amount - platform_fee;

        // Transfer platform fee to treasury
        let cpi_accounts = Transfer {
            from: ctx.accounts.sender_ata.to_account_info(),
            to: ctx.accounts.treasury_ata.to_account_info(),
            authority: ctx.accounts.sender.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, platform_fee)?;

        // Transfer tip to recipient
        let cpi_accounts = Transfer {
            from: ctx.accounts.sender_ata.to_account_info(),
            to: ctx.accounts.recipient_ata.to_account_info(),
            authority: ctx.accounts.sender.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, recipient_amount)?;

        // Record the tip
        tip_record.sender = ctx.accounts.sender.key();
        tip_record.recipient = ctx.accounts.recipient.key();
        tip_record.amount = amount;
        tip_record.post_id = post_id.clone();
        tip_record.timestamp = clock.unix_timestamp;

        // Update stats
        state.total_tips += 1;
        state.total_volume += amount;

        // Update user stats
        let sender_stats = &mut ctx.accounts.sender_stats;
        sender_stats.tips_sent += 1;
        sender_stats.total_sent += amount;

        let recipient_stats = &mut ctx.accounts.recipient_stats;
        recipient_stats.tips_received += 1;
        recipient_stats.total_received += recipient_amount;

        emit!(TipSent {
            sender: ctx.accounts.sender.key(),
            recipient: ctx.accounts.recipient.key(),
            amount,
            recipient_amount,
            platform_fee,
            post_id,
        });

        Ok(())
    }

    pub fn update_platform_fee(ctx: Context<UpdatePlatformFee>, new_fee_bps: u16) -> Result<()> {
        require!(new_fee_bps <= 500, ErrorCode::FeeTooHigh); // Max 5%
        
        let state = &mut ctx.accounts.state;
        state.platform_fee_bps = new_fee_bps;
        
        emit!(PlatformFeeUpdated {
            old_fee: state.platform_fee_bps,
            new_fee: new_fee_bps,
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
#[instruction(amount: u64, post_id: String)]
pub struct SendTip<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,
    
    #[account(
        init,
        payer = sender,
        space = 8 + TipRecord::LEN,
        seeds = [
            b"tip",
            sender.key().as_ref(),
            recipient.key().as_ref(),
            post_id.as_bytes(),
        ],
        bump
    )]
    pub tip_record: Account<'info, TipRecord>,
    
    #[account(
        init_if_needed,
        payer = sender,
        space = 8 + UserStats::LEN,
        seeds = [b"stats", sender.key().as_ref()],
        bump
    )]
    pub sender_stats: Account<'info, UserStats>,
    
    #[account(
        init_if_needed,
        payer = sender,
        space = 8 + UserStats::LEN,
        seeds = [b"stats", recipient.key().as_ref()],
        bump
    )]
    pub recipient_stats: Account<'info, UserStats>,
    
    #[account(mut)]
    pub sender: Signer<'info>,
    /// CHECK: Recipient account
    pub recipient: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub sender_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub recipient_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub treasury_ata: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdatePlatformFee<'info> {
    #[account(
        mut,
        has_one = authority,
    )]
    pub state: Account<'info, State>,
    pub authority: Signer<'info>,
}

#[account]
pub struct State {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub total_tips: u64,
    pub total_volume: u64,
    pub platform_fee_bps: u16,
}

impl State {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 2;
}

#[account]
pub struct TipRecord {
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub post_id: String,
    pub timestamp: i64,
}

impl TipRecord {
    pub const LEN: usize = 32 + 32 + 8 + 64 + 8;
}

#[account]
pub struct UserStats {
    pub tips_sent: u64,
    pub tips_received: u64,
    pub total_sent: u64,
    pub total_received: u64,
}

impl UserStats {
    pub const LEN: usize = 8 + 8 + 8 + 8;
}

#[event]
pub struct TipSent {
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub recipient_amount: u64,
    pub platform_fee: u64,
    pub post_id: String,
}

#[event]
pub struct PlatformFeeUpdated {
    pub old_fee: u16,
    pub new_fee: u16,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Tip amount is too small")]
    TipTooSmall,
    #[msg("Post ID is too long")]
    PostIdTooLong,
    #[msg("Cannot tip yourself")]
    CannotTipSelf,
    #[msg("Platform fee is too high")]
    FeeTooHigh,
}