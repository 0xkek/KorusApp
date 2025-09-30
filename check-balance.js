const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

async function checkBalance() {
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const wallet = new PublicKey('2FBnS8sWnZXwTSQHqu7ZUUA4wC2mggRFeYgS5q7VzUKJ');
  
  try {
    const balance = await connection.getBalance(wallet);
    const solBalance = balance / LAMPORTS_PER_SOL;
    
    console.log('='.repeat(50));
    console.log('💰 WALLET BALANCE CHECK');
    console.log('='.repeat(50));
    console.log(`Wallet: ${wallet.toString()}`);
    console.log(`Balance: ${solBalance.toFixed(4)} SOL`);
    console.log(`\n📊 DEPLOYMENT READINESS:`);
    
    const requiredSol = 2.5; // Minimum for deployment
    const recommendedSol = 3.0; // Recommended with buffer
    
    if (solBalance >= recommendedSol) {
      console.log(`✅ READY - You have ${solBalance.toFixed(4)} SOL (recommended: 3 SOL)`);
      console.log('   Sufficient for deployment with comfortable buffer');
    } else if (solBalance >= requiredSol) {
      console.log(`⚠️  MINIMUM MET - You have ${solBalance.toFixed(4)} SOL (minimum: 2.5 SOL)`);
      console.log('   Can deploy but limited buffer for retries');
    } else {
      const needed = requiredSol - solBalance;
      console.log(`❌ INSUFFICIENT - You have ${solBalance.toFixed(4)} SOL`);
      console.log(`   Need ${needed.toFixed(4)} more SOL (minimum: 2.5 SOL total)`);
    }
    
    console.log('\n💵 At current prices (~$220/SOL):');
    console.log(`   Your balance: ~$${(solBalance * 220).toFixed(2)}`);
    console.log(`   Deployment cost: ~$${(2.5 * 220).toFixed(2)}-$${(3 * 220).toFixed(2)}`);
    
  } catch (error) {
    console.error('Error checking balance:', error);
  }
}

checkBalance();