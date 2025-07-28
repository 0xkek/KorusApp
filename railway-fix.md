# Quick Railway Database Fix

Since the CLI installation is blocked, here's the fastest way to fix your database:

## Option 1: Use Railway's Web Terminal (Fastest)

1. In Railway, go to your **backend service** (GitHub icon)
2. Click on the **"Settings"** tab
3. Scroll down and look for **"Connect"** or **"Web Terminal"** button
4. This opens a terminal in your browser
5. Run this command:
   ```
   echo $DATABASE_URL
   ```
6. If it shows empty, the reference isn't working

## Option 2: Direct Database URL

Based on Railway's standard setup, your database URL should look like this:

1. In your **Postgres service** (elephant), find these values in Variables:
   - PGUSER (usually "postgres")
   - POSTGRES_PASSWORD (a long random string)
   - RAILWAY_TCP_PROXY_DOMAIN (ends with .proxy.rlwy.net)
   - RAILWAY_TCP_PROXY_PORT (usually 5432 or similar)
   - PGDATABASE (usually "railway")

2. Build the URL manually:
   ```
   postgresql://[PGUSER]:[POSTGRES_PASSWORD]@[RAILWAY_TCP_PROXY_DOMAIN]:[RAILWAY_TCP_PROXY_PORT]/[PGDATABASE]
   ```

## Option 3: Use Railway's Dashboard Copy Feature

1. In your Postgres service, go to Variables
2. Hover over `DATABASE_PUBLIC_URL`
3. There should be a **copy icon** (📋) that appears
4. Click it to copy the resolved value
5. Paste this in your backend's DATABASE_URL

The key is getting the actual string, not the template with ${{}} variables.