use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("EventsKorus1111111111111111111111111111111");

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum UserTier {
    Basic,
    Premium,
    Genesis,
}

#[program]
pub mod korus_events {
    use super::*;

    /// Create a new event
    pub fn create_event(
        ctx: Context<CreateEvent>,
        event_id: u64,
        name: String,
        description: String,
        ticket_price: u64,
        max_tickets: u32,
        event_date: i64,
        location: String,
        public_sale_time: i64, // When basic tier can buy
    ) -> Result<()> {
        let event = &mut ctx.accounts.event;
        
        require!(name.len() <= 100, EventError::NameTooLong);
        require!(description.len() <= 500, EventError::DescriptionTooLong);
        require!(location.len() <= 200, EventError::LocationTooLong);
        require!(max_tickets > 0, EventError::InvalidMaxTickets);
        require!(event_date > Clock::get()?.unix_timestamp, EventError::EventDateInPast);
        
        event.event_id = event_id;
        event.organizer = ctx.accounts.organizer.key();
        event.name = name;
        event.description = description;
        event.ticket_price = ticket_price;
        event.max_tickets = max_tickets;
        event.tickets_sold = 0;
        event.event_date = event_date;
        event.location = location;
        event.is_active = true;
        event.created_at = Clock::get()?.unix_timestamp;
        event.total_revenue = 0;
        event.public_sale_time = public_sale_time;
        event.premium_sale_time = public_sale_time - 43200; // 12 hours before public
        
        emit!(EventCreated {
            event_id,
            organizer: ctx.accounts.organizer.key(),
            name: event.name.clone(),
            ticket_price,
            max_tickets,
            event_date,
        });
        
        Ok(())
    }

    /// Purchase tickets for an event
    pub fn purchase_tickets(
        ctx: Context<PurchaseTickets>,
        ticket_count: u32,
        user_tier: UserTier,
    ) -> Result<()> {
        let event = &mut ctx.accounts.event;
        let registration = &mut ctx.accounts.registration;
        
        require!(event.is_active, EventError::EventNotActive);
        require!(ticket_count > 0, EventError::InvalidTicketCount);
        require!(
            event.tickets_sold + ticket_count <= event.max_tickets,
            EventError::NotEnoughTicketsAvailable
        );
        require!(
            Clock::get()?.unix_timestamp < event.event_date,
            EventError::EventAlreadyPassed
        );
        
        // Check tier-based access
        let current_time = Clock::get()?.unix_timestamp;
        match user_tier {
            UserTier::Premium | UserTier::Genesis => {
                require!(
                    current_time >= event.premium_sale_time,
                    EventError::SaleNotStarted
                );
            },
            UserTier::Basic => {
                require!(
                    current_time >= event.public_sale_time,
                    EventError::BasicTierWaitPeriod
                );
            },
        }
        
        let total_price = event.ticket_price
            .checked_mul(ticket_count as u64)
            .ok_or(EventError::Overflow)?;
        
        // Transfer payment to event escrow
        let cpi_accounts = Transfer {
            from: ctx.accounts.buyer_token_account.to_account_info(),
            to: ctx.accounts.event_escrow.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, total_price)?;
        
        // Update event stats
        event.tickets_sold += ticket_count;
        event.total_revenue += total_price;
        
        // Create or update registration
        registration.event_id = event.event_id;
        registration.attendee = ctx.accounts.buyer.key();
        registration.ticket_count = ticket_count;
        registration.total_paid = total_price;
        registration.purchase_date = Clock::get()?.unix_timestamp;
        registration.checked_in = false;
        
        emit!(TicketsPurchased {
            event_id: event.event_id,
            buyer: ctx.accounts.buyer.key(),
            ticket_count,
            total_paid: total_price,
        });
        
        Ok(())
    }

    /// Check in to an event
    pub fn check_in(ctx: Context<CheckIn>) -> Result<()> {
        let registration = &mut ctx.accounts.registration;
        let event = &ctx.accounts.event;
        
        require!(!registration.checked_in, EventError::AlreadyCheckedIn);
        require!(
            Clock::get()?.unix_timestamp >= event.event_date - 3600, // Allow check-in 1 hour before
            EventError::TooEarlyToCheckIn
        );
        
        registration.checked_in = true;
        registration.check_in_time = Some(Clock::get()?.unix_timestamp);
        
        emit!(AttendeeCheckedIn {
            event_id: event.event_id,
            attendee: registration.attendee,
            check_in_time: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Withdraw funds after event (organizer only)
    pub fn withdraw_funds(ctx: Context<WithdrawFunds>) -> Result<()> {
        let event = &ctx.accounts.event;
        
        require!(
            ctx.accounts.organizer.key() == event.organizer,
            EventError::UnauthorizedOrganizer
        );
        require!(
            Clock::get()?.unix_timestamp > event.event_date,
            EventError::EventNotCompleted
        );
        
        // Calculate platform fee (5%)
        let platform_fee = event.total_revenue * 5 / 100;
        let organizer_amount = event.total_revenue - platform_fee;
        
        // Transfer to organizer
        let seeds = &[
            b"event_escrow",
            event.event_id.to_le_bytes().as_ref(),
            &[ctx.bumps.event_escrow],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.event_escrow.to_account_info(),
            to: ctx.accounts.organizer_token_account.to_account_info(),
            authority: ctx.accounts.event_escrow.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, organizer_amount)?;
        
        // Transfer platform fee
        let cpi_accounts_fee = Transfer {
            from: ctx.accounts.event_escrow.to_account_info(),
            to: ctx.accounts.platform_fee_account.to_account_info(),
            authority: ctx.accounts.event_escrow.to_account_info(),
        };
        let cpi_ctx_fee = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts_fee,
            signer
        );
        token::transfer(cpi_ctx_fee, platform_fee)?;
        
        emit!(FundsWithdrawn {
            event_id: event.event_id,
            organizer_amount,
            platform_fee,
        });
        
        Ok(())
    }

    /// Cancel an event and refund all tickets
    pub fn cancel_event(ctx: Context<CancelEvent>) -> Result<()> {
        let event = &mut ctx.accounts.event;
        
        require!(
            ctx.accounts.organizer.key() == event.organizer,
            EventError::UnauthorizedOrganizer
        );
        require!(event.is_active, EventError::EventNotActive);
        require!(
            Clock::get()?.unix_timestamp < event.event_date,
            EventError::EventAlreadyPassed
        );
        
        event.is_active = false;
        
        // Note: Actual refunds would need to be processed separately
        // for each registration, iterating through all buyers
        
        emit!(EventCancelled {
            event_id: event.event_id,
            refund_total: event.total_revenue,
        });
        
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(event_id: u64)]
pub struct CreateEvent<'info> {
    #[account(
        init,
        payer = organizer,
        space = 8 + Event::INIT_SPACE,
        seeds = [b"event", event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub event: Account<'info, Event>,
    
    #[account(
        init,
        payer = organizer,
        token::mint = mint,
        token::authority = event_escrow,
        seeds = [b"event_escrow", event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub event_escrow: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub organizer: Signer<'info>,
    
    pub mint: Account<'info, token::Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PurchaseTickets<'info> {
    #[account(
        mut,
        seeds = [b"event", event.event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub event: Account<'info, Event>,
    
    #[account(
        mut,
        seeds = [b"event_escrow", event.event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub event_escrow: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + Registration::INIT_SPACE,
        seeds = [
            b"registration",
            event.event_id.to_le_bytes().as_ref(),
            buyer.key().as_ref()
        ],
        bump
    )]
    pub registration: Account<'info, Registration>,
    
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key()
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CheckIn<'info> {
    pub event: Account<'info, Event>,
    
    #[account(
        mut,
        seeds = [
            b"registration",
            event.event_id.to_le_bytes().as_ref(),
            attendee.key().as_ref()
        ],
        bump
    )]
    pub registration: Account<'info, Registration>,
    
    pub attendee: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(
        seeds = [b"event", event.event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub event: Account<'info, Event>,
    
    #[account(
        mut,
        seeds = [b"event_escrow", event.event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub event_escrow: Account<'info, TokenAccount>,
    
    pub organizer: Signer<'info>,
    
    #[account(mut)]
    pub organizer_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub platform_fee_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelEvent<'info> {
    #[account(
        mut,
        seeds = [b"event", event.event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub event: Account<'info, Event>,
    
    pub organizer: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Event {
    pub event_id: u64,
    pub organizer: Pubkey,
    #[max_len(100)]
    pub name: String,
    #[max_len(500)]
    pub description: String,
    pub ticket_price: u64,
    pub max_tickets: u32,
    pub tickets_sold: u32,
    pub event_date: i64,
    #[max_len(200)]
    pub location: String,
    pub is_active: bool,
    pub created_at: i64,
    pub total_revenue: u64,
    pub public_sale_time: i64,
    pub premium_sale_time: i64,
}

#[account]
#[derive(InitSpace)]
pub struct Registration {
    pub event_id: u64,
    pub attendee: Pubkey,
    pub ticket_count: u32,
    pub total_paid: u64,
    pub purchase_date: i64,
    pub checked_in: bool,
    pub check_in_time: Option<i64>,
}

#[error_code]
pub enum EventError {
    #[msg("Event name too long (max 100 chars)")]
    NameTooLong,
    #[msg("Event description too long (max 500 chars)")]
    DescriptionTooLong,
    #[msg("Event location too long (max 200 chars)")]
    LocationTooLong,
    #[msg("Invalid max tickets")]
    InvalidMaxTickets,
    #[msg("Event date must be in the future")]
    EventDateInPast,
    #[msg("Event is not active")]
    EventNotActive,
    #[msg("Invalid ticket count")]
    InvalidTicketCount,
    #[msg("Not enough tickets available")]
    NotEnoughTicketsAvailable,
    #[msg("Event has already passed")]
    EventAlreadyPassed,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Already checked in")]
    AlreadyCheckedIn,
    #[msg("Too early to check in")]
    TooEarlyToCheckIn,
    #[msg("Unauthorized organizer")]
    UnauthorizedOrganizer,
    #[msg("Event not completed yet")]
    EventNotCompleted,
    #[msg("Sale has not started yet")]
    SaleNotStarted,
    #[msg("Basic tier must wait for public sale period")]
    BasicTierWaitPeriod,
}

// Events
#[event]
pub struct EventCreated {
    pub event_id: u64,
    pub organizer: Pubkey,
    pub name: String,
    pub ticket_price: u64,
    pub max_tickets: u32,
    pub event_date: i64,
}

#[event]
pub struct TicketsPurchased {
    pub event_id: u64,
    pub buyer: Pubkey,
    pub ticket_count: u32,
    pub total_paid: u64,
}

#[event]
pub struct AttendeeCheckedIn {
    pub event_id: u64,
    pub attendee: Pubkey,
    pub check_in_time: i64,
}

#[event]
pub struct FundsWithdrawn {
    pub event_id: u64,
    pub organizer_amount: u64,
    pub platform_fee: u64,
}

#[event]
pub struct EventCancelled {
    pub event_id: u64,
    pub refund_total: u64,
}