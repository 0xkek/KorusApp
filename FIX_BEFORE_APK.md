# 🚨 MUST FIX BEFORE APK BUILD

## CRITICAL BREAKING ISSUES:

### 1. Add Missing Environment Variables
```bash
# Add to .env file:
EXPO_PUBLIC_SOLANA_NETWORK=devnet  # or mainnet-beta for production
EXPO_PUBLIC_ALLY_TOKEN_ADDRESS=<YOUR_TOKEN_ADDRESS>
EXPO_PUBLIC_HELIUS_API_KEY=<YOUR_API_KEY>
```

### 2. Deploy Backend First
- Push to GitHub
- Deploy backend to Render
- Wait for database to be created
- Run migrations: `npx prisma migrate deploy`

### 3. Fix Wallet Connection
- APK can't use Phantom/Solflare deep linking properly
- Consider using WalletConnect or in-app wallet

### 4. Configure app.json
```json
{
  "expo": {
    "android": {
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

### 5. Build Commands
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure build
eas build:configure

# Build APK
eas build --platform android --profile preview
```

## The app WILL NOT WORK without these fixes!
