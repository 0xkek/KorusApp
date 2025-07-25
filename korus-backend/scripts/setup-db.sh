#!/bin/bash

echo "🚀 Setting up Korus Backend Database"

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Seed database (optional)
if [ -f "prisma/seed.ts" ]; then
  echo "🌱 Seeding database..."
  npx ts-node prisma/seed.ts
fi

echo "✅ Database setup complete!"