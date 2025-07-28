#!/bin/bash

# Fix the TypeScript errors before deploying
echo "Fixing TypeScript errors..."

# Replace all occurrences of dailyRepEarned with weeklyRepEarned
find src -name "*.ts" -type f -exec sed -i.bak 's/dailyRepEarned/weeklyRepEarned/g' {} \;

# Clean up backup files
find src -name "*.bak" -type f -delete

echo "Fixed! Now you can deploy to Railway."