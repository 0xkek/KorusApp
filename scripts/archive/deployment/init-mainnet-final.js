const { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// MAINNET PROGRAM - JUST DEPLOYED!
const PROGRAM_ID = new PublicKey("QVyLfPJ55Y5ZrEz4xR1YzYZUsPwfYjXuFtCa2PAYTQC");

// Platform wallet that receives fees
const TREASURY_WALLET = new PublicKey("7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY");

async function main() {
  console.log("🚀 Mainnet Contract Initialization");
  console.log("=====================================");

  // Load authority keypair
  const authorityKeypairPath = path.join(__dirname, "authority-keypair.json");
  const keypairData = JSON.parse(fs.readFileSync(authorityKeypairPath, 'utf-8'));
  const authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  
  console.log("Program ID:", PROGRAM_ID.toString());
  console.log("Authority:", authorityKeypair.publicKey.toString());
  console.log("Treasury:", TREASURY_WALLET.toString());

  // Connect to mainnet
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  
  // Check balance
  const balance = await connection.getBalance(authorityKeypair.publicKey);
  console.log("Authority balance:", (balance / LAMPORTS_PER_SOL).toFixed(4), "SOL");

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
    
    // Parse the state data
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

  console.log("\nInitializing contract...");

  // Create initialize instruction
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
    
    console.log("✅ Contract initialized successfully on MAINNET!");
    console.log("Transaction signature:", signature);
    console.log(`View on Solscan: https://solscan.io/tx/${signature}`);
    
    // Save configuration
    const config = {
      programId: PROGRAM_ID.toString(),
      authority: authorityKeypair.publicKey.toString(),
      treasury: TREASURY_WALLET.toString(),
      network: "mainnet-beta",
      initialized: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'mainnet-live-config.json'),
      JSON.stringify(config, null, 2)
    );
    
    console.log("\n🎮 READY FOR TESTING!");
    console.log("Configuration saved to mainnet-live-config.json");
    
  } catch (error) {
    console.error("❌ Failed to initialize:", error.message);
    if (error.logs) {
      console.log("Program logs:", error.logs);
    }
  }
}

main().catch(console.error);