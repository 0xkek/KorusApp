const { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } = require('@solana/web3.js');
const fs = require('fs');

async function checkHotWallet() {
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  // App's hot wallet (authority)
  const authorityKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('./authority-keypair.json')))
  );
  const hotWallet = authorityKeypair.publicKey;
  
  // Your CLI wallet
  const cliWallet = new PublicKey('2FBnS8sWnZXwTSQHqu7ZUUA4wC2mggRFeYgS5q7VzUKJ');
  
  try {
    const hotBalance = await connection.getBalance(hotWallet);
    const cliBalance = await connection.getBalance(cliWallet);
    
    console.log('='.repeat(60));
    console.log('💰 WALLET COMPARISON');
    console.log('='.repeat(60));
    
    console.log('\n1️⃣  APP HOT WALLET (Should be used for deployment)');
    console.log(`   Address: ${hotWallet.toString()}`);
    console.log(`   Balance: ${(hotBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    console.log('   Purpose: Controls game escrow, pays for transactions');
    console.log('   Location: ./authority-keypair.json');
    
    console.log('\n2️⃣  YOUR CLI WALLET (Currently configured)');
    console.log(`   Address: ${cliWallet.toString()}`);
    console.log(`   Balance: ${(cliBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    console.log('   Purpose: Personal development wallet');
    console.log('   Location: ~/.config/solana/id.json');
    
    console.log('\n⚠️  RECOMMENDATION:');
    console.log('   You should deploy using the APP HOT WALLET, not your personal wallet.');
    console.log('   This keeps all app funds and control in one place.');
    
    console.log('\n📝 TO DEPLOY WITH HOT WALLET:');
    console.log('   1. Fund the hot wallet: G4WAtEdLYWpDoxNWKVbd2Pv9LoX2feFSxN7mWUXt3kGG');
    console.log('   2. Deploy using: --keypair ./authority-keypair.json');
    
    const requiredSol = 2.5;
    if (hotBalance / LAMPORTS_PER_SOL >= requiredSol) {
      console.log(`\n✅ Hot wallet READY - Has ${(hotBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    } else {
      const needed = requiredSol - (hotBalance / LAMPORTS_PER_SOL);
      console.log(`\n❌ Hot wallet needs ${needed.toFixed(4)} more SOL for deployment`);
    }
    
  } catch (error) {
    console.error('Error checking balances:', error);
  }
}

checkHotWallet();