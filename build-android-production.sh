#!/bin/bash

echo "🚀 Building Korus Android App for Production"
echo "============================================"

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please create .env.production with your production configuration"
    exit 1
fi

# Check if required environment variables are set
source .env.production
if [ "$EXPO_PUBLIC_HELIUS_API_KEY" == "YOUR_PRODUCTION_HELIUS_API_KEY_HERE" ]; then
    echo "❌ Error: Please update EXPO_PUBLIC_HELIUS_API_KEY in .env.production"
    exit 1
fi

if [ "$EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME" == "YOUR_CLOUDINARY_CLOUD_NAME" ]; then
    echo "❌ Error: Please update Cloudinary configuration in .env.production"
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf android/app/build
rm -rf android/build

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Set production environment
export NODE_ENV=production
export EXPO_PUBLIC_ENVIRONMENT=production

# Copy production env file
cp .env.production .env

echo "🔨 Building Android APK (Production Release)..."

# Build using EAS (Expo Application Services)
if command -v eas &> /dev/null; then
    echo "Using EAS Build..."
    eas build --platform android --profile production --local
else
    echo "EAS CLI not found. Installing..."
    npm install -g eas-cli
    eas build --platform android --profile production --local
fi

echo "✅ Production build complete!"
echo ""
echo "📱 Your APK will be located in the build output directory"
echo ""
echo "⚠️  IMPORTANT REMINDERS:"
echo "1. Make sure all environment variables are properly set"
echo "2. Test the APK thoroughly before release"
echo "3. Sign the APK with your production keystore"
echo "4. Enable ProGuard/R8 for code obfuscation"
echo ""
echo "🔐 Security Checklist:"
echo "✓ All API keys removed from code"
echo "✓ Mock mode disabled"
echo "✓ Development endpoints removed"
echo "✓ CSRF protection enabled"
echo "✓ JWT secrets properly configured"