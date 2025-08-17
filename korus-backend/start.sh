#!/bin/bash

echo "🔧 Resolving failed migration if exists..."
npx prisma migrate resolve --applied 20250817000000_add_sponsored_games 2>/dev/null || true

echo "📦 Running migrations..."
npx prisma migrate deploy

echo "🔄 Syncing database schema..."
npx prisma db push --skip-generate --accept-data-loss || true

echo "🚀 Starting server..."
node dist/server.js