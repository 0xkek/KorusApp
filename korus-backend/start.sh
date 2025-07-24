#!/bin/bash
# Run Prisma migrations
npx prisma migrate deploy

# Start the server
npm start