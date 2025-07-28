# New Railway Project Setup - Fresh Start

## Step 1: Create New Railway Project
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account if needed
5. Select your "KorusApp" repository
6. Click "Deploy"

## Step 2: Add PostgreSQL Database
1. In your new project, click "+ New"
2. Select "Database"
3. Choose "Add PostgreSQL"
4. Wait for it to deploy (green checkmark)

## Step 3: Connect Database to Backend
1. Click on the PostgreSQL service
2. Go to "Connect" tab
3. Copy the DATABASE_URL value
4. Click on your backend service (korus-backend)
5. Go to "Variables" tab
6. Click "RAW Editor" (easier than adding one by one)
7. Paste this (replace YOUR_DATABASE_URL with what you copied):

```
DATABASE_URL=YOUR_DATABASE_URL_HERE
JWT_SECRET=your-super-secret-jwt-key-change-this
NODE_ENV=production
PORT=3000
SOLANA_RPC_URL=https://api.devnet.solana.com
```

8. Click "Save"

## Step 4: Update Service Settings
1. Still in your backend service
2. Go to "Settings" tab
3. Scroll to "Root Directory"
4. Set it to: `korus-backend`
5. Scroll to "Build Command"
6. Set it to: `npm install && npx prisma generate && npm run build`
7. Scroll to "Start Command"
8. Set it to: `npx prisma migrate deploy && npm start`
9. Click "Save Changes"

## Step 5: Deploy
Railway will automatically redeploy. Watch the logs to make sure it works.

## Step 6: Test It
1. Get your backend URL from Settings tab
2. Visit: `https://your-backend-url.railway.app/health`
3. You should see: `{"status":"OK","message":"Korus Backend is running!"}`

## That's it!
Your backend should now be running with a real database.

## Troubleshooting:
- If you see "Database connection failed" - double-check the DATABASE_URL
- If you see "relation does not exist" - the migrations didn't run, check logs
- If the build fails - make sure root directory is set to `korus-backend`