# Korus Web Development Session Context

## Project Overview
Korus is a social gaming platform built on Solana blockchain. We're creating a **web version** of an existing React Native mobile app. The web version maintains the same functionality and design language as the mobile app.

## Tech Stack
- **Frontend**: Next.js 15 with React, TypeScript, Tailwind CSS
- **Blockchain**: Solana integration with wallet adapters
- **Styling**: Custom theme system with CSS variables, NativeWind compatibility
- **Architecture**: File-based routing, client-side theme management

## Key Features
- **Wallet Integration**: Solana wallet connection (Phantom, Solflare, etc.)
- **Social Feed**: Posts, replies, likes, tips in SOL
- **Gaming Elements**: Challenges, reputation scoring
- **Theme System**: Multiple color themes (mint, purple, blue, gold, cherry, cyber)
- **Premium Features**: Paid subscriptions with enhanced features

## Current Session Work

### Completed Tasks
1. **Star Icon Standardization**: Fixed star icons across the app to have consistent circular colored backgrounds
2. **Premium Modal Updates**:
   - Replaced premium modal design in profile page
   - Added "+20% rep score" benefit
   - Added glow effects to premium buttons
3. **Reputation Score Icon**: Changed from tuning fork symbol to diamond icon
4. **Wallet Page Improvements**: Enhanced theming, fixed hydration errors, improved color consistency

### Current Issue: Header Text Color Problem
**Problem**: The GAMES and EVENTS buttons in the header show dark/unreadable text in dark mode instead of white text.

**Root Cause**: ThemeProvider import issues causing CSS variables to not load properly.

**Files Involved**:
- `/src/components/Header.tsx` - Header component with navigation buttons
- `/src/app/layout.tsx` - Root layout with ThemeProvider wrapper
- `/src/components/ThemeProvider.tsx` - Theme management system
- `/src/app/globals.css` - CSS variables and theme definitions

**Technical Details**:
- App uses CSS custom properties (--color-korus-text, --color-korus-surface, etc.)
- ThemeProvider dynamically sets these variables based on selected theme
- Header buttons should use `var(--color-korus-text)` for proper theme-aware text color
- Currently getting "ReferenceError: ThemeProvider is not defined" errors

### File Structure Context
```
src/
├── app/
│   ├── layout.tsx (root layout with providers)
│   ├── page.tsx (main feed)
│   ├── wallet/page.tsx (wallet page)
│   ├── profile/page.tsx (user profile)
│   └── settings/page.tsx (app settings)
├── components/
│   ├── Header.tsx (navigation header)
│   ├── ThemeProvider.tsx (theme management)
│   └── WalletProvider.tsx (Solana wallet context)
└── app/globals.css (theme CSS variables)
```

## Next Steps for Sonnet 4.5
1. **Fix ThemeProvider Import**: Resolve the import issue causing "ThemeProvider is not defined" errors
2. **Fix Header Text Colors**: Ensure GAMES/EVENTS buttons show white text in dark mode
3. **Test Theme Switching**: Verify all text adapts properly between light/dark themes
4. **Maintain Theme System**: Don't hardcode colors - use proper CSS variables for theme compatibility

## Important Notes
- The app MUST support both light and dark themes
- Never hardcode colors - always use CSS variables for theme compatibility
- The mobile app has the same theme system, so maintain consistency
- User is in dark mode currently and expects white text on dark backgrounds