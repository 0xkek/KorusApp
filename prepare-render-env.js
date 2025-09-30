const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const fs = require('fs');

// Read the authority keypair
const keypairData = JSON.parse(fs.readFileSync('./authority-keypair.json', 'utf-8'));
const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

console.log('='.repeat(60));
console.log('📋 ENVIRONMENT VARIABLES FOR RENDER');
console.log('='.repeat(60));
console.log('\nAdd these to your Render environment variables:\n');

console.log('AUTHORITY_WALLET_ADDRESS=' + keypair.publicKey.toString());
console.log('AUTHORITY_PRIVATE_KEY=' + bs58.encode(keypair.secretKey));

console.log('\n' + '='.repeat(60));
console.log('📝 INSTRUCTIONS:');
console.log('='.repeat(60));
console.log('1. Go to your Render dashboard');
console.log('2. Navigate to your backend service');
console.log('3. Go to Environment → Environment Variables');
console.log('4. Add the two variables above');
console.log('5. Save and redeploy');

console.log('\n⚠️  SECURITY NOTES:');
console.log('- Keep AUTHORITY_PRIVATE_KEY secret');
console.log('- This wallet controls game completions');
console.log('- Only add to production environment on Render');

console.log('\n💰 WALLET INFO:');
console.log('Authority Wallet: ' + keypair.publicKey.toString());
console.log('Current Balance (mainnet): 0 SOL');
console.log('Current Balance (devnet): 0.498 SOL');
console.log('\nThis wallet will need ~0.1 SOL on mainnet for transaction fees');