/**
 * Script to verify the treasury wallet address in the game escrow program
 */

import { Connection, PublicKey } from '@solana/web3.js';

const GAME_ESCROW_PROGRAM_ID = new PublicKey('4iUdAkPRmZLzUFXTLpt5QPGmUUtP6yfgpPpF3sLD9xtd');
const RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=573b969e-057e-49c1-9652-0b95226030ed';

async function verifyTreasury() {
  const connection = new Connection(RPC_URL, 'confirmed');

  // Derive the state PDA (same as in useGameEscrow)
  const [statePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('state')],
    GAME_ESCROW_PROGRAM_ID
  );

  console.log('📋 Game Escrow Program ID:', GAME_ESCROW_PROGRAM_ID.toBase58());
  console.log('📋 State PDA:', statePda.toBase58());

  try {
    const stateAccount = await connection.getAccountInfo(statePda);

    if (!stateAccount) {
      console.error('❌ Contract state not found! The program may not be initialized.');
      return;
    }

    console.log('✅ Contract state found!');
    console.log('📊 Account data length:', stateAccount.data.length, 'bytes');

    // State layout: discriminator(8) + authority(32) + treasury(32) + ...
    const authorityBytes = stateAccount.data.slice(8, 40);
    const treasuryBytes = stateAccount.data.slice(40, 72);

    const authority = new PublicKey(authorityBytes);
    const treasury = new PublicKey(treasuryBytes);

    console.log('\n🔑 Game Authority Wallet:', authority.toBase58());
    console.log('💰 Treasury Wallet:', treasury.toBase58());

    // Verify against expected wallets
    const expectedAuthority = 'G4WAtEdLYWpDoxNWKVbd2Pv9LoX2feFSxN7mWUXt3kGG';
    const expectedTreasury = 'ByqqYGErKfyLHHd3NjgMnbbxQdPs1kFrPVWPUHUsD31W';

    console.log('\n✅ Verification:');
    console.log('Authority matches expected:', authority.toBase58() === expectedAuthority ? '✅ YES' : '❌ NO');
    console.log('Treasury matches expected:', treasury.toBase58() === expectedTreasury ? '✅ YES' : '❌ NO');

    if (treasury.toBase58() !== expectedTreasury) {
      console.log('\n⚠️  WARNING: Treasury wallet mismatch!');
      console.log('Expected:', expectedTreasury);
      console.log('Actual:  ', treasury.toBase58());
    }

  } catch (error) {
    console.error('❌ Error reading contract state:', error);
  }
}

verifyTreasury();
