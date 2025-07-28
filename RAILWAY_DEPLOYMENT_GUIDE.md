# Railway Deployment Guide for Korus Backend

## Prerequisites
- Railway account (https://railway.app)
- GitHub repository connected to Railway
- This guide assumes you're in the Railway dashboard

## Step 1: Create New Project in Railway
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your "KorusApp" repository
4. Click "Deploy Now"

## Step 2: Add PostgreSQL Database
1. In your project, click "+ New"
2. Select "Database" 
3. Choose "Add PostgreSQL"
4. Wait for deployment (green checkmark)

## Step 3: Configure Environment Variables
1. Click on your backend service (not the database)
2. Go to "Variables" tab
3. Click "RAW Editor"
4. Copy the DATABASE_URL from your PostgreSQL service first:
   - Click on PostgreSQL service
   - Go to "Connect" tab
   - Copy the DATABASE_URL value
5. Return to backend service Variables tab
6. Paste this configuration (replace DATABASE_URL with your copied value):

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_HOST.railway.app:PORT/railway
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-make-it-long
NODE_ENV=production
PORT=3000
SOLANA_RPC_URL=https://api.devnet.solana.com
GENESIS_TOKEN_MINT=TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
FRONTEND_URL=http://localhost:8081
MOCK_MODE=false
```

7. Click "Save"

## Step 4: Configure Service Settings
1. Still in your backend service
2. Go to "Settings" tab
3. Configure these settings:
   - **Root Directory**: `korus-backend`
   - **Watch Paths**: `/korus-backend/**`
   - **Build Command**: Leave empty (railway.json handles this)
   - **Start Command**: Leave empty (railway.json handles this)
4. Click "Save Changes"

## Step 5: Deploy
1. Railway will automatically redeploy
2. Watch the deploy logs for any errors
3. Common issues to watch for:
   - Database connection errors (check DATABASE_URL)
   - Missing environment variables
   - Build failures

## Step 6: Verify Deployment
1. Get your backend URL from Settings tab under "Domains"
2. If no domain is set, click "Generate Domain"
3. Test these endpoints:
   - `https://your-backend-url.railway.app/health`
   - `https://your-backend-url.railway.app/test-db`

## Expected Responses:

### Health Check
```json
{
  "status": "OK",
  "message": "Korus Backend is running!",
  "timestamp": "2025-01-28T..."
}
```

### Database Test
```json
{
  "message": "Database connected successfully!",
  "userCount": 0,
  "postCount": 0,
  "recentUsers": [],
  "tables": "users, posts, replies, interactions, games"
}
```

## Troubleshooting

### "Database connection failed"
- Double-check DATABASE_URL is copied correctly
- Ensure PostgreSQL service is running (green status)
- Check if database migrations ran successfully

### "Build failed"
- Check root directory is set to `korus-backend`
- Ensure all dependencies are in package.json
- Check Node version compatibility (requires Node 20+)

### "Migrations failed"
- The migrations should run automatically on start
- If they fail, check the deploy logs for specific errors
- Database user needs CREATE TABLE permissions

## Important Security Notes
1. Generate a secure JWT_SECRET (use a password generator)
2. Never commit .env files to Git
3. Keep DATABASE_URL private
4. Update FRONTEND_URL when you deploy your frontend

## Next Steps
After backend is running:
1. Update your frontend .env with the Railway backend URL
2. Test authentication flow
3. Create some test posts
4. Monitor logs for any issues