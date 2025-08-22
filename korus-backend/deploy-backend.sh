#!/bin/bash

# Korus Backend Deployment Script
# Safe deployment with rollback capability

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Korus Backend Deployment${NC}"

# Pre-flight checks
echo -e "\n${YELLOW}Pre-flight checks...${NC}"

# Check environment variables
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL not set${NC}"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}❌ JWT_SECRET not set${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment variables OK${NC}"

# Backup current deployment
echo -e "\n${YELLOW}Creating backup...${NC}"
if [ -d "dist" ]; then
    cp -r dist dist.backup.$(date +%s)
    echo -e "${GREEN}✓ Backup created${NC}"
fi

# Install production dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
npm ci --production

# Run database migrations
echo -e "\n${YELLOW}Running database migrations...${NC}"
npx prisma migrate deploy
echo -e "${GREEN}✓ Migrations complete${NC}"

# Build TypeScript
echo -e "\n${YELLOW}Building application...${NC}"
npm run build
echo -e "${GREEN}✓ Build complete${NC}"

# Run health check
echo -e "\n${YELLOW}Starting server for health check...${NC}"
npm start &
SERVER_PID=$!
sleep 5

# Health check
HEALTH=$(curl -s http://localhost:3000/api/health | grep -o '"status":"OK"' || echo "")
if [ "$HEALTH" == '"status":"OK"' ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    kill $SERVER_PID 2>/dev/null || true
else
    echo -e "${RED}❌ Health check failed${NC}"
    kill $SERVER_PID 2>/dev/null || true
    
    # Rollback
    if [ -d "dist.backup.*" ]; then
        echo -e "${YELLOW}Rolling back...${NC}"
        rm -rf dist
        mv dist.backup.* dist
    fi
    exit 1
fi

echo -e "\n${GREEN}✅ Deployment successful!${NC}"
echo -e "Ready to start with: npm start"