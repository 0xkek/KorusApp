const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function prompt(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

async function deployToMainnet() {
  console.log('='.repeat(60));
  console.log('🚀 MAINNET DEPLOYMENT PROCESS');
  console.log('='.repeat(60));
  console.log('\n⚠️  THIS WILL DEPLOY TO MAINNET AND COST REAL SOL!\n');

  // Load authority wallet
  const authorityKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('./authority-keypair.json')))
  );
  
  console.log('Deployment wallet:', authorityKeypair.publicKey.toString());

  // Check balance
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const balance = await connection.getBalance(authorityKeypair.publicKey);
  const solBalance = balance / LAMPORTS_PER_SOL;
  
  console.log('Current balance:', solBalance.toFixed(4), 'SOL');
  
  if (solBalance < 2.5) {
    console.error('❌ Insufficient balance! Need at least 2.5 SOL');
    process.exit(1);
  }
  
  console.log('✅ Sufficient balance for deployment\n');

  // Deployment steps
  console.log('📝 Deployment will:');
  console.log('1. Generate a new program keypair for mainnet');
  console.log('2. Build the contract');
  console.log('3. Deploy to mainnet (~2.5 SOL cost)');
  console.log('4. Initialize with authority and treasury\n');

  const confirm = await prompt('Continue with mainnet deployment? (yes/no): ');
  if (confirm !== 'yes') {
    console.log('Deployment cancelled');
    rl.close();
    return;
  }

  try {
    // Step 1: Generate program keypair
    console.log('\n📦 Step 1: Generating program keypair...');
    const programKeypair = Keypair.generate();
    const programId = programKeypair.publicKey.toString();
    
    // Save program keypair
    fs.writeFileSync(
      './mainnet-program-keypair.json',
      JSON.stringify(Array.from(programKeypair.secretKey))
    );
    
    console.log('Program ID:', programId);

    // Step 2: Update program ID in contract
    console.log('\n📝 Step 2: Updating program ID in contract...');
    const libPath = './korus-contracts/programs/korus-game-escrow/src/lib.rs';
    let libContent = fs.readFileSync(libPath, 'utf-8');
    
    // Replace the declare_id
    libContent = libContent.replace(
      /declare_id!\(".*?"\);/,
      `declare_id!("${programId}");`
    );
    
    fs.writeFileSync(libPath, libContent);
    console.log('✅ Program ID updated');

    // Step 3: Build contract
    console.log('\n🔨 Step 3: Building contract...');
    process.chdir('./korus-contracts');
    execSync('anchor build', { stdio: 'inherit' });
    console.log('✅ Build complete');

    // Step 4: Deploy
    console.log('\n🚀 Step 4: Deploying to mainnet...');
    console.log('This will take a few minutes and cost ~2.5 SOL...\n');
    
    // Write temporary script for deployment
    const deployScript = `
#!/bin/bash
solana program deploy \\
  --url mainnet-beta \\
  --keypair ../authority-keypair.json \\
  --program-id ../mainnet-program-keypair.json \\
  target/deploy/korus_game_escrow.so
`;
    
    fs.writeFileSync('./deploy.sh', deployScript);
    fs.chmodSync('./deploy.sh', '755');
    
    execSync('./deploy.sh', { stdio: 'inherit' });
    
    console.log('\n✅ DEPLOYMENT SUCCESSFUL!');
    console.log('Program deployed to:', programId);

    // Save configuration
    const config = {
      programId: programId,
      authority: authorityKeypair.publicKey.toString(),
      treasury: '7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY',
      network: 'mainnet-beta',
      deployedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      '../mainnet-config.json',
      JSON.stringify(config, null, 2)
    );
    
    console.log('\n📋 Configuration saved to mainnet-config.json');
    console.log('\nNext step: Run initialization script');
    console.log('node init-mainnet.js');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    
    // Restore original program ID if needed
    if (fs.existsSync('./korus-contracts/programs/korus-game-escrow/src/lib.rs.bak')) {
      fs.renameSync(
        './korus-contracts/programs/korus-game-escrow/src/lib.rs.bak',
        './korus-contracts/programs/korus-game-escrow/src/lib.rs'
      );
    }
  }

  rl.close();
}

deployToMainnet().catch(console.error);