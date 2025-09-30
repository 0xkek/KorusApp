#!/bin/bash

echo "🔍 Validating Production Environment Variables"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0

# Frontend Environment Variables Check
echo ""
echo "📱 FRONTEND ENVIRONMENT VARIABLES:"
echo "----------------------------------"

if [ -f ".env.production" ]; then
    source .env.production
    
    # Required Frontend Variables
    if [ -z "$EXPO_PUBLIC_API_URL" ]; then
        echo -e "${RED}❌ EXPO_PUBLIC_API_URL is not set${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ EXPO_PUBLIC_API_URL${NC}: $EXPO_PUBLIC_API_URL"
    fi
    
    if [ -z "$EXPO_PUBLIC_SOLANA_NETWORK" ]; then
        echo -e "${RED}❌ EXPO_PUBLIC_SOLANA_NETWORK is not set${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ EXPO_PUBLIC_SOLANA_NETWORK${NC}: $EXPO_PUBLIC_SOLANA_NETWORK"
    fi
    
    if [ "$EXPO_PUBLIC_HELIUS_API_KEY" == "YOUR_PRODUCTION_HELIUS_API_KEY_HERE" ] || [ -z "$EXPO_PUBLIC_HELIUS_API_KEY" ]; then
        echo -e "${RED}❌ EXPO_PUBLIC_HELIUS_API_KEY needs to be configured${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ EXPO_PUBLIC_HELIUS_API_KEY${NC}: [CONFIGURED]"
    fi
    
    if [ "$EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME" == "YOUR_CLOUDINARY_CLOUD_NAME" ] || [ -z "$EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME" ]; then
        echo -e "${RED}❌ EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME needs to be configured${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME${NC}: $EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME"
    fi
    
    if [ "$EXPO_PUBLIC_ALLY_TOKEN_ADDRESS" == "YOUR_ALLY_TOKEN_MINT_ADDRESS_HERE" ] || [ -z "$EXPO_PUBLIC_ALLY_TOKEN_ADDRESS" ]; then
        echo -e "${YELLOW}⚠️  EXPO_PUBLIC_ALLY_TOKEN_ADDRESS needs to be set when token is deployed${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✅ EXPO_PUBLIC_ALLY_TOKEN_ADDRESS${NC}: $EXPO_PUBLIC_ALLY_TOKEN_ADDRESS"
    fi
else
    echo -e "${RED}❌ .env.production file not found!${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Backend Environment Variables Check
echo ""
echo "🖥️  BACKEND ENVIRONMENT VARIABLES:"
echo "----------------------------------"

if [ -f "korus-backend/.env.production" ]; then
    source korus-backend/.env.production
    
    # Required Backend Variables
    if [ "$DATABASE_URL" == "postgresql://postgres:YOUR_PASSWORD@YOUR_HOST.railway.app:PORT/railway" ] || [ -z "$DATABASE_URL" ]; then
        echo -e "${RED}❌ DATABASE_URL needs to be configured${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ DATABASE_URL${NC}: [CONFIGURED]"
    fi
    
    if [ "$JWT_SECRET" == "GENERATE_A_SECURE_RANDOM_STRING_HERE_AT_LEAST_32_CHARS" ] || [ -z "$JWT_SECRET" ] || [ ${#JWT_SECRET} -lt 32 ]; then
        echo -e "${RED}❌ JWT_SECRET needs to be a secure random string (32+ chars)${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ JWT_SECRET${NC}: [CONFIGURED - ${#JWT_SECRET} chars]"
    fi
    
    if [ "$CSRF_SECRET" == "GENERATE_ANOTHER_SECURE_RANDOM_STRING_HERE_AT_LEAST_32_CHARS" ] || [ -z "$CSRF_SECRET" ] || [ ${#CSRF_SECRET} -lt 32 ]; then
        echo -e "${RED}❌ CSRF_SECRET needs to be a secure random string (32+ chars)${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ CSRF_SECRET${NC}: [CONFIGURED - ${#CSRF_SECRET} chars]"
    fi
    
    if [ "$HELIUS_API_KEY" == "GET_NEW_PRODUCTION_KEY_FROM_HELIUS" ] || [ -z "$HELIUS_API_KEY" ]; then
        echo -e "${RED}❌ HELIUS_API_KEY needs to be configured (get from https://helius.xyz)${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ HELIUS_API_KEY${NC}: [CONFIGURED]"
    fi
    
    if [ "$PLATFORM_WALLET_ADDRESS" == "YOUR_PLATFORM_WALLET_PUBLIC_ADDRESS_HERE" ] || [ -z "$PLATFORM_WALLET_ADDRESS" ]; then
        echo -e "${YELLOW}⚠️  PLATFORM_WALLET_ADDRESS needs to be configured for distributions${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✅ PLATFORM_WALLET_ADDRESS${NC}: $PLATFORM_WALLET_ADDRESS"
    fi
    
    if [ -z "$SOLANA_RPC_URL" ]; then
        echo -e "${RED}❌ SOLANA_RPC_URL is not set${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ SOLANA_RPC_URL${NC}: $SOLANA_RPC_URL"
    fi
else
    echo -e "${RED}❌ korus-backend/.env.production file not found!${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Summary
echo ""
echo "============================================="
echo "📊 VALIDATION SUMMARY:"
echo "============================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL ENVIRONMENT VARIABLES ARE PROPERLY CONFIGURED!${NC}"
    echo "You can proceed with the production build."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Configuration has $WARNINGS warning(s) but is buildable${NC}"
    echo "Review the warnings above before production deployment."
    exit 0
else
    echo -e "${RED}❌ CONFIGURATION HAS $ERRORS ERROR(S)${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}   Also has $WARNINGS warning(s)${NC}"
    fi
    echo ""
    echo "Please fix all errors before attempting production build:"
    echo "1. Update .env.production with your frontend configuration"
    echo "2. Update korus-backend/.env.production with your backend configuration"
    echo "3. Get new Helius API key from https://helius.xyz"
    echo "4. Configure Cloudinary account for image uploads"
    echo "5. Set up PostgreSQL database and get connection URL"
    echo "6. Generate secure random strings for JWT_SECRET and CSRF_SECRET"
    exit 1
fi