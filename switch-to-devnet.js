const fs = require('fs');
const path = require('path');

console.log('🔄 Switching Korus App to DEVNET');
console.log('='.repeat(50));

// Configuration to update
const DEVNET_CONFIG = {
  network: 'devnet',
  rpcUrl: 'https://api.devnet.solana.com',
  programId: '9rLXaB3a8qeb55N119sC3mjK58LyPeXXnj8vEvm3EWFG',
  authority: 'G4WAtEdLYWpDoxNWKVbd2Pv9LoX2feFSxN7mWUXt3kGG',
  treasury: '7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY'
};

// Files to update
const updates = [
  {
    file: 'config/environment.ts',
    changes: [
      { 
        find: /solanaCluster:.*,/, 
        replace: `solanaCluster: 'devnet',` 
      },
      { 
        find: /EXPO_PUBLIC_SOLANA_RPC:.*,/, 
        replace: `EXPO_PUBLIC_SOLANA_RPC: '${DEVNET_CONFIG.rpcUrl}',` 
      }
    ]
  },
  {
    file: 'services/gameEscrowService.ts',
    changes: [
      { 
        find: /GAME_ESCROW_PROGRAM_ID = new PublicKey\(['"].*['"]\)/, 
        replace: `GAME_ESCROW_PROGRAM_ID = new PublicKey('${DEVNET_CONFIG.programId}')` 
      },
      {
        find: /RPC_URL = .*'https:\/\/api\..*\.solana\.com'/,
        replace: `RPC_URL = process.env.EXPO_PUBLIC_SOLANA_RPC || '${DEVNET_CONFIG.rpcUrl}'`
      }
    ]
  },
  {
    file: 'korus-backend/.env',
    changes: [
      {
        find: /SOLANA_RPC_URL=.*/,
        replace: `SOLANA_RPC_URL=${DEVNET_CONFIG.rpcUrl}`
      },
      {
        find: /GAME_ESCROW_PROGRAM_ID=.*/,
        replace: `GAME_ESCROW_PROGRAM_ID=${DEVNET_CONFIG.programId}`
      }
    ]
  }
];

console.log('\n📝 Configuration to apply:');
console.log(`Network: ${DEVNET_CONFIG.network}`);
console.log(`RPC URL: ${DEVNET_CONFIG.rpcUrl}`);
console.log(`Program ID: ${DEVNET_CONFIG.programId}`);
console.log(`Authority: ${DEVNET_CONFIG.authority}`);
console.log(`Treasury: ${DEVNET_CONFIG.treasury}`);

console.log('\n📁 Files to update:');
updates.forEach(u => console.log(`- ${u.file}`));

console.log('\n⚠️  IMPORTANT NOTES:');
console.log('1. This switches the app to use DEVNET (fake SOL)');
console.log('2. Users will need devnet SOL (free from faucet)');
console.log('3. Get devnet SOL: https://faucet.solana.com');
console.log('4. Backend on Render needs SOLANA_RPC_URL updated');
console.log('5. Frontend needs rebuild after config changes');

console.log('\n✅ Ready to switch to devnet!');
console.log('Update the files listed above with the configuration shown.');
console.log('\nFor backend on Render:');
console.log('1. Go to Environment Variables');
console.log('2. Update SOLANA_RPC_URL to:', DEVNET_CONFIG.rpcUrl);
console.log('3. Add GAME_ESCROW_PROGRAM_ID:', DEVNET_CONFIG.programId);
console.log('4. Redeploy');

// Save config for reference
fs.writeFileSync(
  'devnet-config.json',
  JSON.stringify(DEVNET_CONFIG, null, 2)
);

console.log('\n💾 Configuration saved to devnet-config.json');