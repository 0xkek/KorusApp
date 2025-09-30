const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const fs = require('fs');

// Read the keypair
const keypairData = JSON.parse(fs.readFileSync('./authority-keypair.json', 'utf-8'));
const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

console.log('='.repeat(60));
console.log('🔑 AUTHORITY WALLET KEYS');
console.log('='.repeat(60));
console.log('\nPublic Key (Wallet Address):');
console.log(keypair.publicKey.toString());
console.log('\nPrivate Key (Base58 format):');
console.log(bs58.encode(keypair.secretKey));
console.log('\n⚠️  SECURITY WARNING:');
console.log('This private key controls the game escrow contract.');
console.log('Keep it secure and never share it publicly.');
console.log('\nTo import to Phantom/Solflare: Use the Base58 private key above');
console.log('To use in code: Use the authority-keypair.json file');