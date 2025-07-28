#!/bin/sh
set -e

echo "🚀 Starting Korus Backend in Production"

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
until node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  prisma.\$connect()
    .then(() => { console.log('✅ Database connected'); process.exit(0); })
    .catch(() => { process.exit(1); });
" 2>/dev/null; do
  echo "Database not ready, retrying in 5 seconds..."
  sleep 5
done

# Run migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

# Start the server
echo "🚀 Starting server on port ${PORT:-3000}"
exec node dist/server.js