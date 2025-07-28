#!/bin/bash

# This script sets up the database on Railway

echo "🚀 Setting up Korus Backend on Railway..."

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Run migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Seed database (optional)
# echo "🌱 Seeding database..."
# npx prisma db seed

echo "✅ Setup complete!"

# Start the server
echo "🚀 Starting server..."
npm start