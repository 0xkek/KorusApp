const { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction
} = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');
const BN = require('bn.js');

// Program ID
const PROGRAM_ID = new PublicKey("9rLXaB3a8qeb55N119sC3mjK58LyPeXXnj8vEvm3EWFG");
const TREASURY_WALLET = new PublicKey("7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY");

async function main() {
  console.log("🚀 Korus Game Escrow Initialization");
  console.log("=====================================");

  // Load authority keypair
  const authorityKeypairPath = path.join(__dirname, "../../authority-keypair.json");
  const keypairData = JSON.parse(fs.readFileSync(authorityKeypairPath, 'utf-8'));
  const authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  
  console.log("Authority:", authorityKeypair.publicKey.toString());
  console.log("Treasury:", TREASURY_WALLET.toString());

  // Connect to devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  // Get balance
  const balance = await connection.getBalance(authorityKeypair.publicKey);
  console.log("Authority balance:", balance / 1e9, "SOL");

  if (balance < 0.01 * 1e9) {
    console.error("❌ Insufficient balance! Need at least 0.01 SOL");
    return;
  }

  // Derive state PDA
  const [statePda, bump] = await PublicKey.findProgramAddress(
    [Buffer.from("state")],
    PROGRAM_ID
  );
  
  console.log("State PDA:", statePda.toString());

  // Check if already initialized
  const accountInfo = await connection.getAccountInfo(statePda);
  if (accountInfo && accountInfo.data.length > 0) {
    console.log("✅ Contract already initialized!");
    
    // Parse the state data (basic parsing)
    const data = accountInfo.data;
    const authority = new PublicKey(data.slice(8, 40));
    const treasury = new PublicKey(data.slice(40, 72));
    
    console.log("Current authority:", authority.toString());
    console.log("Current treasury:", treasury.toString());
    
    if (authority.equals(authorityKeypair.publicKey)) {
      console.log("✅ Authority matches!");
    } else {
      console.log("⚠️  Authority mismatch - contract controlled by different key");
    }
    return;
  }

  console.log("Initializing contract...");

  // Create initialize instruction
  // Instruction data: discriminator (8 bytes) + treasury pubkey (32 bytes)
  const discriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]); // initialize
  const treasuryBytes = TREASURY_WALLET.toBuffer();
  const instructionData = Buffer.concat([discriminator, treasuryBytes]);

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: statePda, isSigner: false, isWritable: true },
      { pubkey: authorityKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData,
  });

  // Create and send transaction
  const transaction = new Transaction().add(instruction);
  
  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [authorityKeypair],
      { commitment: 'confirmed' }
    );
    
    console.log("✅ Contract initialized successfully!");
    console.log("Transaction signature:", signature);
    
    // Verify initialization
    const newAccountInfo = await connection.getAccountInfo(statePda);
    if (newAccountInfo) {
      console.log("State account created, size:", newAccountInfo.data.length, "bytes");
    }
  } catch (error) {
    console.error("❌ Failed to initialize:", error.message);
    if (error.logs) {
      console.log("Program logs:", error.logs);
    }
  }
}

main().catch(console.error);