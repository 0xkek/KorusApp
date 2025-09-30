const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

async function checkPlatformWallet() {
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  // Platform wallet from .env
  const platformWallet = new PublicKey('7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY');
  
  try {
    const balance = await connection.getBalance(platformWallet);
    const solBalance = balance / LAMPORTS_PER_SOL;
    
    console.log('='.repeat(60));
    console.log('🏦 KORUS PLATFORM WALLET (from Render/backend)');
    console.log('='.repeat(60));
    console.log(`Address: ${platformWallet.toString()}`);
    console.log(`Balance: ${solBalance.toFixed(4)} SOL`);
    console.log('\nThis is configured in backend as PLATFORM_WALLET_ADDRESS');
    console.log('Used for receiving platform fees and shoutout payments');
    
    console.log('\n📊 DEPLOYMENT READINESS:');
    const requiredSol = 2.5;
    
    if (solBalance >= requiredSol) {
      console.log(`✅ READY - Has ${solBalance.toFixed(4)} SOL (need 2.5-3 SOL)`);
      console.log('\n📝 TO DEPLOY:');
      console.log('1. Export the private key from Render env vars');
      console.log('2. Use it to deploy the contract to mainnet');
    } else {
      const needed = requiredSol - solBalance;
      console.log(`❌ NEEDS FUNDING - Has ${solBalance.toFixed(4)} SOL`);
      console.log(`   Need ${needed.toFixed(4)} more SOL (minimum 2.5 SOL total)`);
      console.log(`   At ~$220/SOL: ~$${(needed * 220).toFixed(2)} needed`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkPlatformWallet();