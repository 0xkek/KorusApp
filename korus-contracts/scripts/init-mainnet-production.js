/**
 * Korus Game Escrow - Mainnet Production Initialization
 *
 * Treasury: ByqqYGErKfyLHHd3NjgMnbbxQdPs1kFrPVWPUHUsD31W
 * Hot Wallet: 7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY
 * Program ID: 4iUdAkPRmZLzUFXTLpt5QPGmUUtP6yfgpPpF3sLD9xtd
 */

const anchor = require('@coral-xyz/anchor');
const { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// MAINNET PRODUCTION CONFIG
const PROGRAM_ID = new PublicKey('4iUdAkPRmZLzUFXTLpt5QPGmUUtP6yfgpPpF3sLD9xtd');
const RPC_URL = 'https://api.mainnet-beta.solana.com';
const TREASURY_ADDRESS = new PublicKey('ByqqYGErKfyLHHd3NjgMnbbxQdPs1kFrPVWPUHUsD31W');

async function initialize() {
  console.log('🚀 Korus Game Escrow - Mainnet Initialization');
  console.log('='.repeat(50));
  console.log('');
  console.log('⚠️  MAINNET DEPLOYMENT - REAL SOL');
  console.log('');

  // Load authority keypair
  const authorityKeypairPath = path.join(__dirname, '../../authority-keypair.json');
  const authorityKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(authorityKeypairPath, 'utf-8')))
  );

  console.log('Program ID:', PROGRAM_ID.toBase58());
  console.log('Authority:', authorityKeypair.publicKey.toBase58());
  console.log('Treasury:', TREASURY_ADDRESS.toBase58());
  console.log('');

  // Setup connection
  const connection = new Connection(RPC_URL, 'confirmed');

  // Check authority balance
  const balance = await connection.getBalance(authorityKeypair.publicKey);
  console.log('Authority Balance:', (balance / LAMPORTS_PER_SOL).toFixed(4), 'SOL');
  console.log('');

  if (balance < 0.05 * LAMPORTS_PER_SOL) {
    console.error('❌ Insufficient balance! Need at least 0.05 SOL');
    process.exit(1);
  }

  // Load IDL
  const idlPath = path.join(__dirname, '../target/idl/korus_game_escrow.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));

  // Create provider
  const wallet = new anchor.Wallet(authorityKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });

  // Create program instance
  const program = new anchor.Program(idl, PROGRAM_ID, provider);

  try {
    console.log('📝 Checking contract state...');

    // Derive state PDA
    const [statePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('state')],
      program.programId
    );

    console.log('State PDA:', statePDA.toBase58());
    console.log('');

    // Check if already initialized
    try {
      const state = await program.account.state.fetch(statePDA);
      console.log('');
      console.log('✅ Contract is already initialized!');
      console.log('');
      console.log('Current State:');
      console.log('  Authority:', state.authority.toBase58());
      console.log('  Treasury:', state.treasury.toBase58());
      console.log('  Total Games:', state.totalGames.toString());
      console.log('  Total Volume:', (state.totalVolume.toNumber() / LAMPORTS_PER_SOL).toFixed(4), 'SOL');
      console.log('  Platform Fee:', state.platformFeeBps, 'bps (2%)');
      console.log('  Active Games:', state.activeGames.toString());
      console.log('');
      console.log('View on Solscan:');
      console.log(`https://solscan.io/account/${PROGRAM_ID.toBase58()}`);
      return;
    } catch (e) {
      console.log('Contract not initialized yet, proceeding...');
      console.log('');
    }

    // Initialize
    console.log('🔄 Initializing contract...');
    const tx = await program.methods
      .initialize(TREASURY_ADDRESS)
      .accounts({
        state: statePDA,
        authority: authorityKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log('');
    console.log('✅ Initialization successful!');
    console.log('');
    console.log('Transaction:', tx);
    console.log('View on Solscan:', `https://solscan.io/tx/${tx}`);
    console.log('');

    // Fetch and display state
    const state = await program.account.state.fetch(statePDA);
    console.log('Contract State:');
    console.log('  Authority:', state.authority.toBase58());
    console.log('  Treasury:', state.treasury.toBase58());
    console.log('  Platform Fee:', state.platformFeeBps, 'bps (2%)');
    console.log('  Total Games:', state.totalGames.toString());
    console.log('  Active Games:', state.activeGames.toString());
    console.log('');

    console.log('🎉 Mainnet deployment complete!');
    console.log('');
    console.log('Program URL:', `https://solscan.io/account/${PROGRAM_ID.toBase58()}`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Update backend .env with GAME_ESCROW_PROGRAM_ID');
    console.log('2. Update frontend environment config');
    console.log('3. Test with small wagers (0.01 SOL)');

  } catch (error) {
    console.error('❌ Initialization failed:', error);

    if (error.logs) {
      console.error('Program logs:');
      error.logs.forEach(log => console.error(log));
    }

    process.exit(1);
  }
}

// Run
initialize()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });