const { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } = require('@solana/web3.js');
const fs = require('fs');

async function checkAuthorityWallet() {
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const devnetConnection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load authority keypair
  const keypairData = JSON.parse(fs.readFileSync('./authority-keypair.json', 'utf-8'));
  const authorityKeypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
  const authorityWallet = authorityKeypair.publicKey;
  
  console.log('='.repeat(60));
  console.log('🔑 AUTHORITY WALLET (Local file)');
  console.log('='.repeat(60));
  console.log(`Address: ${authorityWallet.toString()}`);
  console.log('Location: ./authority-keypair.json');
  console.log('Created: September 9, 2024');
  console.log('Purpose: Controls game escrow contract');
  
  const mainnetBalance = await connection.getBalance(authorityWallet);
  const devnetBalance = await devnetConnection.getBalance(authorityWallet);
  
  console.log('\n💰 BALANCES:');
  console.log(`Mainnet: ${(mainnetBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(`Devnet:  ${(devnetBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  
  console.log('\n⚠️  IMPORTANT:');
  console.log('This keypair only exists locally on your computer.');
  console.log('For the backend to complete games on Render, you need to:');
  console.log('1. Upload this keypair to Render as AUTHORITY_PRIVATE_KEY');
  console.log('2. OR use the platform wallet as authority instead');
  
  console.log('\n🔐 SECURITY NOTE:');
  console.log('This is a generated wallet, not tied to any exchange or personal account.');
  console.log('It was created specifically for controlling the game contract.');
}

checkAuthorityWallet();