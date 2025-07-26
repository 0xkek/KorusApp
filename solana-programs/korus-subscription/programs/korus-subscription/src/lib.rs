use anchor_lang::prelude::*;
use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;

declare_id!("SubKorus11111111111111111111111111111111111");

const SECONDS_PER_MONTH: i64 = 30 * 24 * 60 * 60; // 30 days
const SECONDS_PER_YEAR: i64 = 365 * 24 * 60 * 60; // 365 days
const GRACE_PERIOD_DAYS: i64 = 2 * 24 * 60 * 60; // 2 days grace period
const MONTHLY_PRICE: u64 = LAMPORTS_PER_SOL / 10; // 0.1 SOL
const YEARLY_PRICE: u64 = LAMPORTS_PER_SOL; // 1 SOL

#[program]
pub mod korus_subscription {
    use super::*;

    /// Initialize the subscription program configuration
    pub fn initialize(
        ctx: Context<Initialize>,
        treasury: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.treasury = treasury;
        config.total_subscribers = 0;
        config.total_payment_requests = 0;
        
        emit!(ConfigInitialized {
            authority: config.authority,
            treasury,
        });
        
        Ok(())
    }

    /// Create a payment request for subscription renewal
    pub fn create_payment_request(
        ctx: Context<CreatePaymentRequest>,
    ) -> Result<()> {
        let subscription = &ctx.accounts.subscription;
        let clock = Clock::get()?;
        
        // Check if payment is due today or overdue
        let payment_due_today = clock.unix_timestamp >= subscription.next_payment_due;
        require!(
            payment_due_today,
            SubscriptionError::PaymentNotDueYet
        );
        
        // Check if there's already an active payment request
        let payment_request = &mut ctx.accounts.payment_request;
        require!(
            payment_request.status != PaymentRequestStatus::Pending,
            SubscriptionError::PaymentRequestAlreadyActive
        );
        
        // Create new payment request
        payment_request.subscriber = subscription.subscriber;
        payment_request.amount = if subscription.payment_type == PaymentType::Yearly {
            YEARLY_PRICE
        } else {
            MONTHLY_PRICE
        };
        payment_request.created_at = clock.unix_timestamp;
        payment_request.expires_at = subscription.next_payment_due + GRACE_PERIOD_DAYS;
        payment_request.status = PaymentRequestStatus::Pending;
        payment_request.payment_type = subscription.payment_type;
        
        let config = &mut ctx.accounts.config;
        config.total_payment_requests += 1;
        
        emit!(PaymentRequestCreated {
            subscriber: subscription.subscriber,
            amount: payment_request.amount,
            payment_type: payment_request.payment_type,
            expires_at: payment_request.expires_at,
        });
        
        Ok(())
    }

    /// Subscribe to premium (first time) - user initiated
    pub fn subscribe_premium(
        ctx: Context<SubscribePremium>,
        payment_type: PaymentType,
    ) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription;
        let clock = Clock::get()?;
        
        // Initialize subscription
        subscription.subscriber = ctx.accounts.subscriber.key();
        subscription.tier = SubscriptionTier::Premium;
        subscription.payment_type = payment_type;
        subscription.start_date = clock.unix_timestamp;
        subscription.last_payment_date = clock.unix_timestamp;
        subscription.is_active = true;
        subscription.payment_count = 1;
        
        // Set next payment due based on payment type
        subscription.next_payment_due = match payment_type {
            PaymentType::Monthly => clock.unix_timestamp + SECONDS_PER_MONTH,
            PaymentType::Yearly => clock.unix_timestamp + SECONDS_PER_YEAR,
        };
        
        // Transfer payment
        let amount = match payment_type {
            PaymentType::Monthly => MONTHLY_PRICE,
            PaymentType::Yearly => YEARLY_PRICE,
        };
        
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.subscriber.key(),
            &ctx.accounts.treasury.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.subscriber.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
            ],
        )?;
        
        // Update total subscribers
        let config = &mut ctx.accounts.config;
        config.total_subscribers += 1;
        
        emit!(SubscriptionCreated {
            subscriber: ctx.accounts.subscriber.key(),
            payment_type,
            amount,
            next_payment_due: subscription.next_payment_due,
        });
        
        Ok(())
    }

    /// Approve and pay a payment request
    pub fn approve_payment_request(
        ctx: Context<ApprovePaymentRequest>,
    ) -> Result<()> {
        let payment_request = &mut ctx.accounts.payment_request;
        let subscription = &mut ctx.accounts.subscription;
        let clock = Clock::get()?;
        
        // Verify payment request is valid
        require!(
            payment_request.status == PaymentRequestStatus::Pending,
            SubscriptionError::PaymentRequestNotPending
        );
        require!(
            payment_request.subscriber == ctx.accounts.subscriber.key(),
            SubscriptionError::UnauthorizedPayer
        );
        require!(
            clock.unix_timestamp <= payment_request.expires_at,
            SubscriptionError::PaymentRequestExpired
        );
        
        // Transfer payment
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.subscriber.key(),
            &ctx.accounts.treasury.key(),
            payment_request.amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.subscriber.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
            ],
        )?;
        
        // Update subscription
        subscription.last_payment_date = clock.unix_timestamp;
        subscription.payment_count += 1;
        subscription.is_active = true;
        
        // Set next payment due
        subscription.next_payment_due = match subscription.payment_type {
            PaymentType::Monthly => subscription.next_payment_due + SECONDS_PER_MONTH,
            PaymentType::Yearly => subscription.next_payment_due + SECONDS_PER_YEAR,
        };
        
        // Mark payment request as completed
        payment_request.status = PaymentRequestStatus::Completed;
        payment_request.paid_at = Some(clock.unix_timestamp);
        
        emit!(PaymentRequestApproved {
            subscriber: ctx.accounts.subscriber.key(),
            amount: payment_request.amount,
            payment_type: payment_request.payment_type,
            next_payment_due: subscription.next_payment_due,
        });
        
        Ok(())
    }

    /// Reject a payment request
    pub fn reject_payment_request(
        ctx: Context<RejectPaymentRequest>,
    ) -> Result<()> {
        let payment_request = &mut ctx.accounts.payment_request;
        
        require!(
            payment_request.status == PaymentRequestStatus::Pending,
            SubscriptionError::PaymentRequestNotPending
        );
        require!(
            payment_request.subscriber == ctx.accounts.subscriber.key(),
            SubscriptionError::UnauthorizedPayer
        );
        
        payment_request.status = PaymentRequestStatus::Rejected;
        
        emit!(PaymentRequestRejected {
            subscriber: ctx.accounts.subscriber.key(),
            amount: payment_request.amount,
        });
        
        Ok(())
    }

    /// Check and update subscription status
    pub fn check_subscription_status(
        ctx: Context<CheckSubscriptionStatus>,
    ) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription;
        let clock = Clock::get()?;
        
        // Check if subscription has expired (past grace period)
        if clock.unix_timestamp > subscription.next_payment_due + GRACE_PERIOD_DAYS {
            if subscription.is_active {
                subscription.is_active = false;
                subscription.tier = SubscriptionTier::Basic;
                
                // Update total subscribers
                let config = &mut ctx.accounts.config;
                if config.total_subscribers > 0 {
                    config.total_subscribers -= 1;
                }
                
                emit!(SubscriptionExpired {
                    subscriber: subscription.subscriber,
                    expired_at: clock.unix_timestamp,
                });
            }
        }
        
        Ok(())
    }

    /// Change payment type (monthly to yearly or vice versa)
    pub fn change_payment_type(
        ctx: Context<ChangePaymentType>,
        new_payment_type: PaymentType,
    ) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription;
        
        require!(
            subscription.tier == SubscriptionTier::Premium,
            SubscriptionError::NotPremiumSubscriber
        );
        require!(
            subscription.is_active,
            SubscriptionError::SubscriptionNotActive
        );
        require!(
            ctx.accounts.subscriber.key() == subscription.subscriber,
            SubscriptionError::UnauthorizedSubscriber
        );
        
        subscription.payment_type = new_payment_type;
        
        emit!(PaymentTypeChanged {
            subscriber: subscription.subscriber,
            new_payment_type,
        });
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreatePaymentRequest<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    
    #[account(
        seeds = [b"subscription", subscription.subscriber.as_ref()],
        bump
    )]
    pub subscription: Account<'info, Subscription>,
    
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + PaymentRequest::INIT_SPACE,
        seeds = [
            b"payment_request",
            subscription.subscriber.as_ref(),
            subscription.payment_count.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub payment_request: Account<'info, PaymentRequest>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubscribePremium<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    
    #[account(
        init,
        payer = subscriber,
        space = 8 + Subscription::INIT_SPACE,
        seeds = [b"subscription", subscriber.key().as_ref()],
        bump
    )]
    pub subscription: Account<'info, Subscription>,
    
    #[account(mut)]
    pub subscriber: Signer<'info>,
    
    /// CHECK: Treasury account to receive payments
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApprovePaymentRequest<'info> {
    #[account(
        mut,
        seeds = [b"subscription", subscriber.key().as_ref()],
        bump
    )]
    pub subscription: Account<'info, Subscription>,
    
    #[account(
        mut,
        seeds = [
            b"payment_request",
            subscriber.key().as_ref(),
            subscription.payment_count.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub payment_request: Account<'info, PaymentRequest>,
    
    #[account(mut)]
    pub subscriber: Signer<'info>,
    
    /// CHECK: Treasury account to receive payments
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RejectPaymentRequest<'info> {
    #[account(
        mut,
        seeds = [
            b"payment_request",
            subscriber.key().as_ref(),
            payment_request.subscriber.as_ref()
        ],
        bump
    )]
    pub payment_request: Account<'info, PaymentRequest>,
    
    pub subscriber: Signer<'info>,
}

#[derive(Accounts)]
pub struct CheckSubscriptionStatus<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    
    #[account(
        mut,
        seeds = [b"subscription", subscription.subscriber.as_ref()],
        bump
    )]
    pub subscription: Account<'info, Subscription>,
}

#[derive(Accounts)]
pub struct ChangePaymentType<'info> {
    #[account(
        mut,
        seeds = [b"subscription", subscriber.key().as_ref()],
        bump
    )]
    pub subscription: Account<'info, Subscription>,
    
    pub subscriber: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub total_subscribers: u32,
    pub total_payment_requests: u64,
}

#[account]
#[derive(InitSpace)]
pub struct Subscription {
    pub subscriber: Pubkey,
    pub tier: SubscriptionTier,
    pub payment_type: PaymentType,
    pub start_date: i64,
    pub last_payment_date: i64,
    pub next_payment_due: i64,
    pub is_active: bool,
    pub payment_count: u32,
}

#[account]
#[derive(InitSpace)]
pub struct PaymentRequest {
    pub subscriber: Pubkey,
    pub amount: u64,
    pub payment_type: PaymentType,
    pub created_at: i64,
    pub expires_at: i64,
    pub status: PaymentRequestStatus,
    pub paid_at: Option<i64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum SubscriptionTier {
    Basic,
    Premium,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum PaymentType {
    Monthly,
    Yearly,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum PaymentRequestStatus {
    Pending,
    Completed,
    Rejected,
    Expired,
}

#[error_code]
pub enum SubscriptionError {
    #[msg("Payment not due yet")]
    PaymentNotDueYet,
    #[msg("Payment request already active")]
    PaymentRequestAlreadyActive,
    #[msg("Payment request not pending")]
    PaymentRequestNotPending,
    #[msg("Unauthorized payer")]
    UnauthorizedPayer,
    #[msg("Payment request expired")]
    PaymentRequestExpired,
    #[msg("Not a premium subscriber")]
    NotPremiumSubscriber,
    #[msg("Subscription not active")]
    SubscriptionNotActive,
    #[msg("Unauthorized subscriber")]
    UnauthorizedSubscriber,
}

// Events
#[event]
pub struct ConfigInitialized {
    pub authority: Pubkey,
    pub treasury: Pubkey,
}

#[event]
pub struct SubscriptionCreated {
    pub subscriber: Pubkey,
    pub payment_type: PaymentType,
    pub amount: u64,
    pub next_payment_due: i64,
}

#[event]
pub struct PaymentRequestCreated {
    pub subscriber: Pubkey,
    pub amount: u64,
    pub payment_type: PaymentType,
    pub expires_at: i64,
}

#[event]
pub struct PaymentRequestApproved {
    pub subscriber: Pubkey,
    pub amount: u64,
    pub payment_type: PaymentType,
    pub next_payment_due: i64,
}

#[event]
pub struct PaymentRequestRejected {
    pub subscriber: Pubkey,
    pub amount: u64,
}

#[event]
pub struct SubscriptionExpired {
    pub subscriber: Pubkey,
    pub expired_at: i64,
}

#[event]
pub struct PaymentTypeChanged {
    pub subscriber: Pubkey,
    pub new_payment_type: PaymentType,
}