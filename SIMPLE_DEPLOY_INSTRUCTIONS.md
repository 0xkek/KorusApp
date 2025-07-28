# Simple Deploy Instructions (No Database)

I've modified your backend to work WITHOUT a database for now. This will get your app running on Railway immediately.

## What I Changed:

1. Created a simple server that stores data in memory (no database needed)
2. Updated Railway configuration to skip database migrations
3. Modified the start command to use the simple server

## To Deploy:

1. **Commit and push these changes:**
   ```bash
   git add .
   git commit -m "Use simple server without database"
   git push
   ```

2. **Railway will automatically redeploy**

## What Works:
- ✅ User authentication (wallet login)
- ✅ Basic post creation and viewing
- ✅ Health check endpoint
- ✅ No database setup needed!

## Limitations:
- ⚠️ Data is stored in memory only
- ⚠️ All data is lost when server restarts
- ⚠️ This is temporary - just to get you running

## Later (When Ready for Database):

To switch back to full database version:
1. Set up PostgreSQL in Railway
2. Add DATABASE_URL to environment variables
3. Change package.json start script back to: `"start": "node dist/server.js"`
4. Update railway.toml to include migrations again

For now, this will get your app working without dealing with database complexity!