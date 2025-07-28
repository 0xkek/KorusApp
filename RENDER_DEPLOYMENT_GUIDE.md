# Render Deployment Guide for Korus App

## Backend Deployment Status: ✅ COMPLETE

Your backend is successfully deployed at:
- **Backend URL**: https://korus-backend.onrender.com
- **Health Check**: https://korus-backend.onrender.com/health
- **Database Test**: https://korus-backend.onrender.com/test-db

## Environment Variables Configured
- DATABASE_URL (PostgreSQL)
- JWT_SECRET
- NODE_ENV=production
- PORT=3000
- MOCK_MODE=false

## API Endpoints Available
- POST `/api/auth/connect` - Wallet authentication
- GET `/api/posts` - Get all posts
- POST `/api/posts` - Create new post
- POST `/api/posts/:id/replies` - Add reply
- POST `/api/interactions/posts/:id/like` - Like a post
- GET `/api/search?query=...` - Search posts

## Frontend Configuration Needed

Create a `.env.local` file in your frontend root:
```
EXPO_PUBLIC_API_URL=https://korus-backend.onrender.com/api
```

## Testing the API

Test wallet connection:
```bash
curl -X POST https://korus-backend.onrender.com/api/auth/connect \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "test123", "signature": "test", "message": "test"}'
```

## Notes
- Backend auto-deploys on push to main branch
- Database migrations run automatically on deploy
- Free tier may sleep after 15 mins of inactivity (first request will be slow)