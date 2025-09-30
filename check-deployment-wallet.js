const { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } = require('@solana/web3.js');
const fs = require('fs');

async function checkDeploymentWallet() {
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  // Authority wallet (deployment wallet)
  const keypairData = JSON.parse(fs.readFileSync('./authority-keypair.json', 'utf-8'));
  const authorityKeypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
  const deploymentWallet = authorityKeypair.publicKey;
  
  const balance = await connection.getBalance(deploymentWallet);
  const solBalance = balance / LAMPORTS_PER_SOL;
  
  console.log('='.repeat(60));
  console.log('💰 DEPLOYMENT WALLET STATUS');
  console.log('='.repeat(60));
  console.log(`Wallet: ${deploymentWallet.toString()}`);
  console.log(`Balance: ${solBalance.toFixed(4)} SOL`);
  
  const requiredSol = 2.5;
  
  if (solBalance >= requiredSol) {
    console.log('\n✅ READY FOR MAINNET DEPLOYMENT');
    console.log('\nNext steps:');
    console.log('1. cd korus-contracts/scripts');
    console.log('2. ./deploy-mainnet.sh');
    console.log('3. node init-mainnet.js');
  } else {
    const needed = requiredSol - solBalance;
    console.log(`\n❌ Need ${needed.toFixed(4)} more SOL`);
    console.log(`\nSend ${needed.toFixed(4)} SOL to:`);
    console.log(deploymentWallet.toString());
    console.log(`\nAt ~$220/SOL: ~$${(needed * 220).toFixed(2)}`);
  }
}

checkDeploymentWallet();