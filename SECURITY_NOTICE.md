# ⚠️ URGENT SECURITY NOTICE

## Exposed API Key Removed

The Helius API key that was previously hardcoded in `utils/nft.ts` has been removed and replaced with an environment variable.

**Old exposed key:** `3d27295a-caf5-4a92-9fee-b52aa43e54bd`

### Actions Required:

1. **Revoke the exposed key immediately** at https://helius.dev
2. **Generate a new API key** from your Helius dashboard
3. **Add the new key** to your `.env.local` file:
   ```
   EXPO_PUBLIC_HELIUS_API_KEY=your-new-key-here
   ```

### Security Best Practices:
- Never commit API keys to version control
- Use environment variables for all secrets
- Add `.env.local` to `.gitignore` (already done)
- Rotate keys regularly
- Use different keys for development and production

## Other Security Improvements Made:
- JWT_SECRET now required from environment
- Authentication bypass controlled by ALLOW_AUTH_BYPASS flag
- CORS whitelist configuration added
- Debug logging disabled in production

## Still Pending:
- Genesis token verification implementation
- Database connection setup
- Memory leak fixes