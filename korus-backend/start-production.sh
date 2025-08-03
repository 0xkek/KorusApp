#!/bin/bash

echo "Starting production server..."

# Check if the failed migration exists
if npx prisma migrate status 2>&1 | grep -q "20250803000000_add_notifications.*failed"; then
  echo "Found failed migration, resolving it..."
  npx prisma migrate resolve --applied 20250803000000_add_notifications
  echo "Migration marked as resolved"
fi

# Run any pending migrations
echo "Running migrations..."
npx prisma migrate deploy

# Start the server
echo "Starting Node.js server..."
node dist/server.js