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

// MAINNET PROGRAM ID - JUST DEPLOYED!
const PROGRAM_ID = new PublicKey("8fFhZjy4GQJzG2WDkF6VakUnNt3CVpDSf7UHQNM3TgQZ");

// Platform wallet that receives fees
const TREASURY_WALLET = new PublicKey("7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY");

async function main() {
  console.log("🚀 Mainnet Contract Initialization");
  console.log("=====================================");
  console.log("⚠️  THIS IS MAINNET - REAL MONEY!");
  console.log("");

  // Load authority keypair
  const authorityKeypairPath = path.join(__dirname, "authority-keypair.json");
  const keypairData = JSON.parse(fs.readFileSync(authorityKeypairPath, 'utf-8'));
  const authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  
  console.log("Program ID:", PROGRAM_ID.toString());
  console.log("Authority:", authorityKeypair.publicKey.toString());
  console.log("Treasury (platform wallet):", TREASURY_WALLET.toString());

  // Connect to mainnet
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  
  // Check balance
  const balance = await connection.getBalance(authorityKeypair.publicKey);
  console.log("Authority balance:", (balance / LAMPORTS_PER_SOL).toFixed(4), "SOL");

  if (balance < 0.01 * LAMPORTS_PER_SOL) {
    console.error("❌ Insufficient balance! Need at least 0.01 SOL for initialization");
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
    
    // Verify initialization
    const newAccountInfo = await connection.getAccountInfo(statePda);
    if (newAccountInfo) {
      console.log("State account created, size:", newAccountInfo.data.length, "bytes");
    }

    // Save the configuration
    const config = {
      programId: PROGRAM_ID.toString(),
      authority: authorityKeypair.publicKey.toString(),
      treasury: TREASURY_WALLET.toString(),
      network: "mainnet-beta",
      initialized: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'mainnet-config.json'),
      JSON.stringify(config, null, 2)
    );
    
    console.log("\n✅ Configuration saved to mainnet-config.json");
    console.log("\n🎉 MAINNET DEPLOYMENT COMPLETE!");
    console.log("\nNext steps:");
    console.log("1. Update frontend to use program ID:", PROGRAM_ID.toString());
    console.log("2. Update backend GAME_ESCROW_PROGRAM_ID env var");
    console.log("3. Update backend SOLANA_RPC_URL to mainnet");
    
  } catch (error) {
    console.error("❌ Failed to initialize:", error.message);
    if (error.logs) {
      console.log("Program logs:", error.logs);
    }
  }
}

main().catch(console.error);