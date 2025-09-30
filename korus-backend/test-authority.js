const { gameEscrowService } = require('./src/services/gameEscrowService');
const { loadAuthorityKeypair } = require('./src/config/solana');

async function test() {
  console.log('🔍 Testing Backend Authority Configuration\n');
  
  // Check authority keypair
  const authority = loadAuthorityKeypair();
  console.log('Backend Authority:', authority.publicKey.toString());
  
  // Check contract initialization
  console.log('\n📋 Checking contract state...');
  const isInitialized = await gameEscrowService.checkInitialization();
  
  if (isInitialized) {
    console.log('\n✅ Backend authority matches contract!');
  } else {
    console.log('\n❌ Authority mismatch - backend cannot complete games');
  }
}

test().catch(console.error);
