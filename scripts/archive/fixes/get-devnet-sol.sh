#!/bin/bash

echo "💰 Getting Devnet SOL for Testing"
echo "================================="
echo ""

# Wallets to fund
AUTHORITY="G4WAtEdLYWpDoxNWKVbd2Pv9LoX2feFSxN7mWUXt3kGG"
PLATFORM="7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY"

echo "Requesting 2 SOL for Authority wallet..."
curl -X POST -H "Content-Type: application/json" -d "{
  \"jsonrpc\": \"2.0\",
  \"id\": 1,
  \"method\": \"requestAirdrop\",
  \"params\": [\"$AUTHORITY\", 2000000000]
}" https://api.devnet.solana.com

echo ""
echo "Requesting 2 SOL for Platform wallet..."
curl -X POST -H "Content-Type: application/json" -d "{
  \"jsonrpc\": \"2.0\",
  \"id\": 1,
  \"method\": \"requestAirdrop\",
  \"params\": [\"$PLATFORM\", 2000000000]
}" https://api.devnet.solana.com

echo ""
echo "✅ Airdrop requested!"
echo ""
echo "You can also get more devnet SOL from:"
echo "https://faucet.solana.com"
echo ""
echo "To check balances:"
echo "Authority: https://explorer.solana.com/address/$AUTHORITY?cluster=devnet"
echo "Platform: https://explorer.solana.com/address/$PLATFORM?cluster=devnet"