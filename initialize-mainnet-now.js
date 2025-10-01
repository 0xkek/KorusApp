// Quick mainnet initialization
const { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');

const PROGRAM_ID = new PublicKey('4iUdAkPRmZLzUFXTLpt5QPGmUUtP6yfgpPpF3sLD9xtd');
const TREASURY = new PublicKey('ByqqYGErKfyLHHd3NjgMnbbxQdPs1kFrPVWPUHUsD31W');

async function init() {
  console.log('🚀 Initializing mainnet contract...');

  const authority = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('authority-keypair.json', 'utf-8')))
  );

  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

  // Derive state PDA
  const [statePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('state')],
    PROGRAM_ID
  );

  console.log('State PDA:', statePDA.toBase58());
  console.log('Authority:', authority.publicKey.toBase58());
  console.log('Treasury:', TREASURY.toBase58());

  // Check if already initialized
  const stateAccount = await connection.getAccountInfo(statePDA);
  if (stateAccount) {
    console.log('✅ Already initialized!');
    console.log('State account data length:', stateAccount.data.length);
    return;
  }

  console.log('Not initialized, creating instruction...');

  // Build initialize instruction manually
  const discriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]); // "initialize" discriminator
  const treasuryBytes = TREASURY.toBuffer();
  const data = Buffer.concat([discriminator, treasuryBytes]);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: statePDA, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });

  const tx = new Transaction().add(instruction);

  console.log('Sending transaction...');
  const sig = await connection.sendTransaction(tx, [authority], {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  console.log('Waiting for confirmation...');
  await connection.confirmTransaction(sig, 'confirmed');

  console.log('');
  console.log('✅ Initialized!');
  console.log('Transaction:', sig);
  console.log('View:', `https://solscan.io/tx/${sig}`);
}

init().catch(console.error);