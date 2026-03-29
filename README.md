# Korus — Social Platform on Solana

A social media platform where every account is a verified Solana wallet. No bots, no fake accounts — just real people.

**Live at [korus.fun](https://korus.fun)**

## Features

- **Wallet-Only Auth** — Sign in with Phantom, Solflare, or any Solana wallet
- **Tips** — Send SOL directly to creators you like
- **Games** — Wager SOL in Tic-Tac-Toe, Rock Paper Scissors, Connect Four with on-chain escrow
- **Shoutouts** — Paid promoted posts with timed visibility and queue system
- **Events** — Community events with registration and countdowns
- **Reputation** — Earn rep from engagement, tips, and game wins
- **Premium Tiers** — NFT-gated features and early access

## Tech Stack

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend**: Express + Prisma + PostgreSQL
- **Blockchain**: Solana (Anchor smart contracts for escrow + tipping)
- **Deploy**: Vercel (web) + Render (backend)

## Project Structure

```
korus-web/        — Next.js frontend
korus-backend/    — Express API server
korus-contracts/  — Solana Anchor programs
```

## Development

```bash
# Frontend
cd korus-web && npm install && npm run dev

# Backend
cd korus-backend && npm install && npm run dev
```

## Deployment

- Web auto-deploys to Vercel on push to `main`
- Backend auto-deploys to Render on push to `main`
