# Korus Events Smart Contract

A Solana smart contract for event ticketing and registration built with Anchor framework.

## Features

- **Event Creation**: Organizers can create events with custom pricing and capacity
- **Ticket Sales**: Secure ticket purchasing with escrow payment handling
- **Check-in System**: QR code-ready check-in functionality
- **Revenue Distribution**: Automatic platform fee and organizer payout
- **Refund Support**: Cancel events and process refunds
- **On-chain Records**: Complete ticket and attendance history

## Event Lifecycle

1. **Create Event**: Set name, description, price, capacity, date, location
2. **Sell Tickets**: Users purchase tickets, funds held in escrow
3. **Check In**: Attendees check in on event day
4. **Withdraw**: After event, organizer withdraws revenue (minus 5% fee)
5. **Cancel**: If needed, cancel event and enable refunds

## Integration with Korus App

This contract enables:
- Community events and meetups
- Paid workshops and seminars
- Concert and festival ticketing
- Exclusive Korus member events
- Reputation rewards for attendance

## Security Features

- Escrow-based payment handling
- Time-based constraints
- Authorization checks
- Overflow protection
- PDA-based account derivation

## Token Support

Designed for ALLY token payments, adaptable for SOL or other SPL tokens.

## Platform Benefits

- 5% platform fee supports Korus ecosystem
- Transparent on-chain ticketing
- No hidden fees for buyers
- Instant settlement for organizers
- Immutable attendance records

## Future Enhancements

- NFT tickets for collectibility
- Tiered pricing (early bird, VIP, etc.)
- Waitlist functionality
- Group discounts
- Recurring events
- Virtual event support