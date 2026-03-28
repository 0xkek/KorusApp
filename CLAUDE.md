# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Structure

Korus is a Solana-integrated social media platform. The monorepo contains:

- `korus-web/` — Next.js 15 frontend (deployed on Vercel)
- `korus-backend/` — Express + Prisma backend (deployed on Render)
- `korus-contracts/` — Anchor/Solana smart contracts (game escrow + tipping, deployed on mainnet)

## Development Commands

### Frontend (Next.js)
```bash
cd korus-web
npm run build    # Build for production
npm run dev      # Local dev server (but everything is live — see notes)
```

### Backend (Express/Prisma)
```bash
cd korus-backend
npm run dev      # Development with hot reload
npm run build    # Build TypeScript
npm start        # Production server

# Database
npx prisma migrate dev    # Run migrations
npx prisma generate       # Generate Prisma client
npx prisma studio         # Database GUI
```

## Architecture

### Frontend (`korus-web/`)
- **Framework**: Next.js 15 (App Router)
- **Routing**: File-based in `src/app/`
- **State**: Zustand store + React hooks
- **Styling**: Tailwind CSS with CSS variables for theming
- **Wallet**: `@solana/wallet-adapter-react` with Phantom/Solflare
- **Real-time**: Socket.IO client for live feed updates

### Backend (`korus-backend/`)
- **API**: RESTful Express routes in `src/routes/`
- **Database**: PostgreSQL via Prisma ORM (`prisma/schema.prisma`)
- **Auth**: Solana wallet signature verification → JWT tokens
- **Real-time**: Socket.IO for broadcasting new posts/updates
- **Models**: User, Post, Reply, Like, Tip, Notification, Report, Event, Game

### Smart Contracts (`korus-contracts/`)
- **Game Escrow**: Wagering, escrow, winner payouts, 2.5% platform fee
- **Tipping**: Direct SOL tips between users, 1% platform fee

## Key Patterns

- All RPC calls go through `/api/rpc` proxy — never use `useConnection()` directly
- Frontend API calls use service modules in `src/services/api/`
- Admin routes check `ADMIN_WALLETS` array for authorization
- Posts can be: regular, shoutouts (timed), reposts, or reply reposts
- Shoutout queue system: one active at a time, others queued

## Deployment

- **No dev server** — everything is live
- Web auto-deploys to Vercel on push to `main`
- Backend auto-deploys to Render on push to `main`
- Safety tag: `v1.0-pre-cleanup` on GitHub
