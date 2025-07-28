# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (React Native/Expo)
```bash
# Start development server
npm start

# Platform-specific development
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run web      # Web browser

# Linting
npm run lint
```

### Backend (Node.js/Express)
```bash
cd korus-backend

# Development with hot reload
npm run dev

# Build TypeScript
npm run build

# Production server
npm start

# Database operations
npx prisma migrate dev    # Run migrations in development
npx prisma generate       # Generate Prisma client
npx prisma studio         # Open database GUI
```

## Architecture Overview

This is a social media platform called "Korus" with blockchain integration, consisting of:

### Frontend (React Native/Expo)
- **Navigation**: File-based routing via Expo Router in `/app` directory
- **State Management**: React Context API (ThemeContext in `/context`)
- **Styling**: Tailwind CSS via NativeWind with custom Korus theme colors
- **Components**: Modular UI components in `/components`
  - Post/Reply system with modals
  - Custom alert system (KorusAlert/KorusAlertProvider)
  - Wallet integration components

### Backend (Express/Prisma)
- **API Structure**: RESTful API in `/korus-backend/src`
  - Controllers handle business logic
  - Routes define API endpoints
  - Middleware for JWT authentication
- **Database**: PostgreSQL with Prisma ORM
  - Schema defined in `/korus-backend/prisma/schema.prisma`
  - Models: User, Post, Reply, Like, Tip, Notification
- **Authentication**: Dual system
  - Traditional: JWT with bcrypt password hashing
  - Web3: Solana wallet signature verification

### Key Features
1. **Wallet Authentication**: Users can sign in with Solana wallets
2. **Content System**: Posts, replies, likes, tips (crypto)
3. **Categorization**: Posts organized by categories and subcategories
4. **Notifications**: Real-time notification system
5. **Theme Support**: Light/dark mode via ThemeContext

## Important Patterns

### API Endpoints
All backend routes follow RESTful conventions:
- `/api/auth/*` - Authentication endpoints
- `/api/posts/*` - Post CRUD operations
- `/api/replies/*` - Reply operations
- `/api/interactions/*` - Likes, tips

### Frontend Routing
Uses Expo Router file-based routing:
- `app/(tabs)/*` - Tab navigation screens
- `app/subcategory-feed.tsx` - Dynamic feed screens
- Modal components handle overlay interactions

### Type Safety
- TypeScript used throughout with strict mode
- Shared types in `/types` (frontend) and `/korus-backend/src/types` (backend)
- Prisma generates types from database schema

### Styling Conventions
- Tailwind utility classes for styling
- Custom theme colors defined in `tailwind.config.js`
- NativeWind for React Native Tailwind support
- Inter font family for typography

## Development Notes

1. **No test suite configured** - Tests need to be set up for both frontend and backend
2. **Environment variables** required for:
   - Database connection (DATABASE_URL)
   - JWT secret (JWT_SECRET)
   - API endpoints
3. **Blockchain integration** requires Solana wallet libraries
4. **Mock data** available in `/data` for development without backend
5. **Push notifications** - expo-notifications requires a development build instead of Expo Go for SDK 53+. Currently using local notifications only.