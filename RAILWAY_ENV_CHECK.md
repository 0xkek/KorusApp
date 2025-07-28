# Railway Environment Variables Checklist

Your Railway deployment is failing because the backend can't connect to the database. Please ensure these environment variables are set in Railway:

## Required Environment Variables

1. **DATABASE_URL** (CRITICAL)
   - This should be your PostgreSQL connection string
   - Format: `postgresql://user:password@host:port/database?schema=public`
   - If using Railway's PostgreSQL, use the `DATABASE_URL` from the database service

2. **JWT_SECRET**
   - Any secure random string (e.g., generate with `openssl rand -base64 32`)
   - Example: `your-super-secret-jwt-key-here`

3. **SOLANA_RPC_URL** (Optional, has default)
   - Default: `https://api.devnet.solana.com`
   - Can leave empty to use default

4. **NODE_ENV**
   - Set to: `production`

## How to Set in Railway

1. Go to your Railway project
2. Click on the backend service
3. Go to "Variables" tab
4. Add each variable above

## Quick Database Setup

If you haven't set up a database yet:

1. In Railway, click "New" → "Database" → "Add PostgreSQL"
2. Once created, click on the PostgreSQL service
3. Go to "Connect" tab
4. Copy the `DATABASE_URL` value
5. Paste it in your backend service's environment variables

## Verify Deployment

After setting variables, Railway will automatically redeploy. The logs should show:
- "✅ Database connected successfully"
- "🚀 Korus Backend running on..."

## Current Error

The 500 error on `/api/auth/connect` indicates the database connection is failing, which causes the authentication to fail when trying to create/find users.