# Hackathon Deployment Checklist for Korus App

## 🚀 Backend Deployment on Railway

### Step 1: Railway Setup
- [ ] Go to https://railway.app and sign in
- [ ] Create new project → Deploy from GitHub → Select KorusApp repo
- [ ] Wait for initial deployment (it will fail - that's expected)

### Step 2: Add PostgreSQL Database
- [ ] In Railway project, click "+ New" → Database → Add PostgreSQL
- [ ] Wait for PostgreSQL to deploy (green checkmark)
- [ ] Click on PostgreSQL service → Connect tab → Copy DATABASE_URL

### Step 3: Configure Backend Environment Variables
- [ ] Click on backend service (not database)
- [ ] Go to Variables tab → RAW Editor
- [ ] Paste this configuration:
```
DATABASE_URL=[PASTE YOUR DATABASE_URL HERE]
JWT_SECRET=generate-a-very-long-random-string-here-at-least-32-characters
NODE_ENV=production
PORT=3000
SOLANA_RPC_URL=https://api.devnet.solana.com
GENESIS_TOKEN_MINT=TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
FRONTEND_URL=http://localhost:8081
MOCK_MODE=false
```

### Step 4: Configure Service Settings
- [ ] In backend service → Settings tab
- [ ] Set Root Directory: `korus-backend`
- [ ] Set Watch Paths: `/korus-backend/**`
- [ ] Save changes and let Railway redeploy

### Step 5: Generate Domain
- [ ] In Settings tab → Domains section
- [ ] Click "Generate Domain"
- [ ] Copy your backend URL (e.g., https://korusapp-production.up.railway.app)

### Step 6: Verify Backend
- [ ] Visit: `https://your-backend-url.railway.app/health`
- [ ] Should see: `{"status":"OK","message":"Korus Backend is running!"}`
- [ ] Visit: `https://your-backend-url.railway.app/test-db`
- [ ] Should see database connection success

## 📱 Frontend Configuration

### Step 1: Create Frontend Environment File
- [ ] In your KorusApp root directory, create `.env.local`:
```
EXPO_PUBLIC_API_URL=https://your-backend-url.railway.app/api
```

### Step 2: Update API Configuration
- [ ] Open `utils/api.ts`
- [ ] Verify line 6 uses: `process.env.EXPO_PUBLIC_API_URL || 'https://korusapp-production.up.railway.app/api'`
- [ ] Update the fallback URL if needed

### Step 3: Test Frontend Locally
```bash
npm start
```
- [ ] Test wallet connection
- [ ] Create a test post
- [ ] Verify data persists in database

## ✅ Pre-Hackathon Testing

### API Endpoints to Test:
1. [ ] Health check: GET `/health`
2. [ ] Database test: GET `/test-db`
3. [ ] Auth connect: POST `/api/auth/connect`
4. [ ] Get posts: GET `/api/posts`
5. [ ] Create post: POST `/api/posts`

### Features to Demo:
- [ ] Wallet authentication (Solana)
- [ ] Create and view posts
- [ ] Like/tip functionality
- [ ] Reply to posts
- [ ] Category filtering
- [ ] Search functionality
- [ ] Dark/light theme toggle

## 🔧 Troubleshooting

### Backend Issues:
1. **"Cannot connect to database"**
   - Check DATABASE_URL is correct
   - Ensure PostgreSQL service is running
   - Check deploy logs for migration errors

2. **"Build failed"**
   - Verify root directory is `korus-backend`
   - Check Node version (needs 20+)
   - Review build logs

3. **"401 Unauthorized"**
   - Check JWT_SECRET is set
   - Verify frontend is sending auth token
   - Check CORS settings

### Frontend Issues:
1. **"Network request failed"**
   - Verify EXPO_PUBLIC_API_URL is correct
   - Check if backend is running
   - Test with browser first

2. **"CORS error"**
   - Backend allows all origins in dev
   - Update FRONTEND_URL in backend env

## 📊 Demo Script

1. **Introduction** (30 seconds)
   - "Korus is a decentralized social media platform"
   - "Built with React Native, Node.js, and Solana integration"

2. **Wallet Connection** (1 minute)
   - Show Solana wallet connection
   - Explain Web3 authentication

3. **Core Features** (2 minutes)
   - Create a post
   - Like and tip with crypto
   - Show real-time updates
   - Category organization

4. **Technical Highlights** (1 minute)
   - PostgreSQL with Prisma ORM
   - JWT + Wallet signature auth
   - React Native with Expo
   - Deployed on Railway

5. **Future Vision** (30 seconds)
   - Token rewards system
   - NFT integration
   - Decentralized moderation

## 🎯 Final Checks
- [ ] Backend is live and responding
- [ ] Frontend connects to backend
- [ ] Demo account ready
- [ ] Test data created
- [ ] Backup deployment ready
- [ ] Presentation slides prepared

Good luck with your hackathon! 🚀