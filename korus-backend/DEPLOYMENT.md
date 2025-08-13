# Korus Backend Deployment Guide

## Mainnet Deployment Checklist

### 1. Environment Variables
Update the following in your production environment (Render/Railway/etc):

```env
# Required
DATABASE_URL=your_production_database_url
JWT_SECRET=generate_secure_32_char_random_string
NODE_ENV=production
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
FRONTEND_URL=https://korus.app
MOCK_MODE=false

# Optional but recommended
SOLANA_CLUSTER=mainnet-beta
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

### 2. Database Setup
1. Run migrations on production database:
   ```bash
   npx prisma migrate deploy
   ```

2. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

### 3. Build Commands
```bash
npm run build
npm start
```

### 4. Render Deployment
If using Render, update these settings:
- Build Command: `npm install && npx prisma generate && npm run build`
- Start Command: `npx prisma migrate deploy && npm start`
- Environment: Add all variables from step 1

### 5. Security Checklist
- [ ] JWT_SECRET is unique and secure (not the default)
- [ ] DATABASE_URL uses SSL connection
- [ ] CORS is configured for production domain only
- [ ] Rate limiting is enabled
- [ ] MOCK_MODE is set to false
- [ ] All devnet references updated to mainnet

### 6. Post-Deployment Verification
1. Check API health: `https://your-backend.com/api/health`
2. Test wallet authentication with mainnet wallet
3. Verify database connections
4. Monitor logs for any errors

### 7. Monitoring
- Set up error tracking (Sentry, LogRocket, etc)
- Configure uptime monitoring
- Set up database backup schedule