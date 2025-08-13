# Render Environment Variables Checklist

Update these environment variables in your Render dashboard:

## Required Variables

```env
# Database (Render provides this)
DATABASE_URL=<Render provides this automatically>

# Authentication
JWT_SECRET=<Generate a secure 32+ character random string>

# Server
PORT=3000
NODE_ENV=production

# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_CLUSTER=mainnet-beta
GENESIS_TOKEN_MINT=So11111111111111111111111111111111111111112

# Frontend URL (for CORS)
FRONTEND_URL=https://korus.app

# Mock Mode (MUST be false for production)
MOCK_MODE=false

# Optional but recommended
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

## How to Generate JWT_SECRET

Option 1 - Using Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Option 2 - Using OpenSSL:
```bash
openssl rand -hex 32
```

Option 3 - Using online generator:
https://www.grc.com/passwords.htm

## Steps to Update on Render:

1. Go to https://dashboard.render.com
2. Select your "korus-backend" service
3. Click "Environment" in the left sidebar
4. Add/Update each variable
5. Click "Save Changes"
6. Service will automatically redeploy

## Verify Deployment:

After deployment completes, check:
1. https://korus-backend.onrender.com/api/health
2. Logs for any errors
3. Test wallet authentication on mainnet