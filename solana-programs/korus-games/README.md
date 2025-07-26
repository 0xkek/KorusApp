# Korus Games Smart Contract

A Solana smart contract for peer-to-peer wagering games built with Anchor framework.

## Features

- **Multiple Game Types**: Support for CoinFlip, Rock-Paper-Scissors, Dice Roll, and custom games
- **Secure Escrow**: Wagers held in escrow until game completion
- **Fair Distribution**: 98% to winner, 2% platform fee
- **Player Protection**: Cancel games if no opponent joins
- **On-chain Events**: Full game history tracking

## Game Flow

1. **Initialize Game**: Player 1 creates a game with a wager amount
2. **Join Game**: Player 2 joins and matches the wager
3. **Play**: Game logic happens off-chain (for now)
4. **Complete**: Winner is determined and funds distributed
5. **Cancel**: Player 1 can cancel if no one joins

## Integration with Korus App

This contract will power the games feature in Korus, allowing users to:
- Challenge friends to wagering games
- Earn reputation points for wins
- Build their gaming score
- Compete on leaderboards

## Token Support

Currently designed for ALLY token, but can be adapted for SOL or other SPL tokens.

## Security Features

- PDA-based escrow accounts
- Atomic token transfers
- Authorization checks
- State validation

## Future Enhancements

- On-chain randomness for trustless games
- Tournament brackets
- Multi-player games
- Time limits with auto-resolution
- Oracle integration for complex games