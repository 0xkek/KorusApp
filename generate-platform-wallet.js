// Generate a new Solana wallet for platform use
// Run: node generate-platform-wallet.js

const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');

console.log('=== GENERATING PLATFORM WALLET ===\n');
console.log('⚠️  SECURITY WARNING:');
console.log('Keep the private key EXTREMELY secure!');
console.log('Never share it or commit it to Git!\n');

// Generate new keypair
const keypair = Keypair.generate();

// Get the keys
const publicKey = keypair.publicKey.toString();
const secretKey = keypair.secretKey;
const privateKey = bs58.encode(secretKey);

console.log('=== NEW PLATFORM WALLET ===\n');
console.log('PUBLIC ADDRESS (safe to share):');
console.log(publicKey);
console.log('\nPRIVATE KEY (KEEP SECRET):');
console.log(privateKey);
console.log('\n=== FOR RENDER DASHBOARD ===\n');
console.log(`PLATFORM_WALLET_ADDRESS=${publicKey}`);
console.log(`PLATFORM_PUBLIC_KEY=${publicKey}`);
console.log(`PLATFORM_PRIVATE_KEY=${privateKey}`);
console.log('\nFor TEAM_WALLET_ADDRESS, you can:');
console.log('1. Use the same wallet (not recommended)');
console.log('2. Generate another wallet for team funds');
console.log('3. Use an existing team wallet\n');
console.log('⚠️  IMPORTANT:');
console.log('1. Save the private key in a secure password manager');
console.log('2. NEVER put the private key in .env files that might be committed');
console.log('3. Only add to Render dashboard environment variables');
console.log('4. Fund this wallet with some SOL for transaction fees');