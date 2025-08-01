#!/bin/bash

echo "🚀 Deploying Korus to Vercel..."
echo ""

# Check if we have a web-build directory
if [ -d "web-build" ]; then
    echo "📁 Found existing web-build directory. Removing..."
    rm -rf web-build
fi

echo "📦 Building Expo web app..."
npx expo export --platform web --output-dir web-build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Copy phone frame if it exists
    if [ -f "web/phone-frame.html" ]; then
        echo "📱 Adding phone frame wrapper..."
        cp web/phone-frame.html web-build/demo.html
    fi
    
    echo ""
    echo "🔧 Now deploying to Vercel..."
    echo ""
    npx vercel --prod
else
    echo "❌ Build failed. Please fix errors and try again."
    exit 1
fi