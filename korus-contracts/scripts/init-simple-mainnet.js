/**
 * Simple Mainnet Initialization (No IDL Required)
 */

const anchor = require('@coral-xyz/anchor');
const { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

const PROGRAM_ID = new PublicKey('4iUdAkPRmZLzUFXTLpt5QPGmUUtP6yfgpPpF3sLD9xtd');
const TREASURY = new PublicKey('ByqqYGErKfyLHHd3NjgMnbbxQdPs1kFrPVWPUHUsD31W');
const RPC_URL = 'https://api.mainnet-beta.solana.com';

// Minimal IDL for initialization only
const IDL = {
  version: "0.1.0",
  name: "korus_game_escrow",
  metadata: { address: "4iUdAkPRmZLzUFXTLpt5QPGmUUtP6yfgpPpF3sLD9xtd" },
  instructions: [
    {
      name: "initialize",
      accounts: [
        { name: "state", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "treasury", type: "publicKey" }
      ]
    }
  ],
  accounts: [
    {
      name: "State",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "publicKey" },
          { name: "treasury", type: "publicKey" },
          { name: "totalGames", type: "u64" },
          { name: "totalVolume", type: "u64" },
          { name: "platformFeeBps", type: "u16" },
          { name: "activeGames", type: "u64" }
        ]
      }
    }
  ]
};

async function initialize() {
  console.log('🚀 Korus Mainnet Initialization (Simple)');
  console.log('='.repeat(50));
  console.log('');

  // Load authority
  const authorityPath = path.join(__dirname, '../../authority-keypair.json');
  const authority = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(authorityPath, 'utf-8')))
  );

  console.log('Program:', PROGRAM_ID.toBase58());
  console.log('Authority:', authority.publicKey.toBase58());
  console.log('Treasury:', TREASURY.toBase58());
  console.log('');

  // Setup
  const connection = new Connection(RPC_URL, 'confirmed');
  const wallet = new anchor.Wallet(authority);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new anchor.Program(IDL, PROGRAM_ID, provider);

  // Derive state PDA
  const [statePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('state')],
    PROGRAM_ID
  );

  console.log('State PDA:', statePDA.toBase58());
  console.log('');

  // Check if initialized
  try {
    const state = await program.account.state.fetch(statePDA);
    console.log('✅ Already initialized!');
    console.log('');
    console.log('State:');
    console.log('  Authority:', state.authority.toBase58());
    console.log('  Treasury:', state.treasury.toBase58());
    console.log('  Total Games:', state.totalGames.toString());
    console.log('  Platform Fee:', state.platformFeeBps, 'bps');
    console.log('  Active Games:', state.activeGames.toString());
    console.log('');
    console.log('✅ Mainnet contract ready!');
    console.log(`https://solscan.io/account/${PROGRAM_ID.toBase58()}`);
    return;
  } catch (e) {
    console.log('Not initialized, proceeding...');
  }

  // Initialize
  console.log('Initializing...');
  const tx = await program.methods
    .initialize(TREASURY)
    .accounts({
      state: statePDA,
      authority: authority.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log('');
  console.log('✅ Initialized!');
  console.log('Transaction:', tx);
  console.log(`https://solscan.io/tx/${tx}`);
  console.log('');

  // Verify
  const state = await program.account.state.fetch(statePDA);
  console.log('State:');
  console.log('  Authority:', state.authority.toBase58());
  console.log('  Treasury:', state.treasury.toBase58());
  console.log('  Platform Fee:', state.platformFeeBps, 'bps (2%)');
  console.log('');
  console.log('🎉 Ready for production!');
  console.log(`https://solscan.io/account/${PROGRAM_ID.toBase58()}`);
}

initialize().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });