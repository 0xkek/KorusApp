# Korus - Hackathon Demo Deployment Guide

## Quick Deploy to Vercel (Recommended)

### Option 1: Deploy via Web Interface
1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "Import Project"
4. Select your Korus repository
5. Use these settings:
   - Framework Preset: Other
   - Build Command: `npx expo export --platform web --output-dir web-build`
   - Output Directory: `web-build`
   - Install Command: `npm install`
6. Add environment variable:
   - `EXPO_PUBLIC_API_URL`: `https://korus-backend.onrender.com/api`
7. Click Deploy

### Option 2: Deploy via CLI
```bash
# In the project directory
npx vercel

# Follow the prompts:
# - Link to existing project? No
# - What's your project's name? korus-hackathon
# - In which directory is your code located? ./
# - Want to override the settings? Yes
# - Build Command: npx expo export --platform web --output-dir web-build
# - Output Directory: web-build
# - Development Command: npm run web
```

## Share with Hackathon Judges

Once deployed, you'll get a URL like: `https://korus-hackathon.vercel.app`

Share this URL with the judges. They can:
1. Visit the URL in any modern browser
2. Connect their Solana wallet (Phantom, Solflare, etc.)
3. Or use the demo wallets provided in the instructions
4. Try all features: posting, likes, replies, tips, games

## Demo Wallets (Pre-funded with ALLY tokens)

For quick testing without wallet setup:
- **Demo Wallet 1**: `Demo1K8tQpVHgLpQeN4eSkVHgfr6k6pVxZfO3syhUser`
- **Demo Wallet 2**: `Demo2L9uRqWJhMpRfO5fTlWIhgs7l7qWyAg1PtziBVser`

Each demo wallet starts with 5000 ALLY tokens.

## Features to Showcase

1. **Wallet Authentication**: Connect any Solana wallet
2. **Content Creation**: Create posts with images
3. **Social Features**: Like, reply, and tip posts
4. **Gaming**: Challenge others to on-chain games
5. **Categories**: Browse different content categories
6. **Premium Features**: See premium user benefits

## Troubleshooting

If the deployment fails:
- Make sure all dependencies are installed: `npm install`
- Check that the build works locally: `npx expo export --platform web --output-dir web-build`
- Verify the API URL is correct in environment variables

## Alternative: Share via Expo

If web deployment doesn't work:
```bash
# Install Expo CLI
npm install -g expo-cli

# Publish to Expo
expo publish

# Share the Expo link with judges
# They can scan the QR code with Expo Go app
```

## Backend Information

The backend is already deployed at: https://korus-backend.onrender.com

API endpoints:
- Health check: https://korus-backend.onrender.com/api/health
- Posts: https://korus-backend.onrender.com/api/posts
- Auth: https://korus-backend.onrender.com/api/auth

The database is hosted on Render's PostgreSQL service.