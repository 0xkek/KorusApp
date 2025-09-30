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

// Load the deployed program ID
let PROGRAM_ID;
try {
  const programKeypairPath = path.join(__dirname, 'mainnet-program-keypair.json');
  const programKeypair = JSON.parse(fs.readFileSync(programKeypairPath, 'utf-8'));
  PROGRAM_ID = Keypair.fromSecretKey(new Uint8Array(programKeypair)).publicKey;
} catch (error) {
  console.error("❌ Could not load mainnet program ID. Run deploy-mainnet.sh first!");
  process.exit(1);
}

// Platform wallet that receives fees
const TREASURY_WALLET = new PublicKey("7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY");

async function main() {
  console.log("🚀 Mainnet Contract Initialization");
  console.log("=====================================");
  console.log("⚠️  THIS IS MAINNET - REAL MONEY!");
  console.log("");

  // Load authority keypair
  const authorityKeypairPath = path.join(__dirname, "../../authority-keypair.json");
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

  // Confirm before proceeding
  console.log("\n⚠️  About to initialize contract on MAINNET");
  console.log("This will cost ~0.01 SOL");
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise(resolve => {
    readline.question('Continue? (yes/no): ', resolve);
  });
  readline.close();

  if (answer !== 'yes') {
    console.log("Initialization cancelled");
    return;
  }

  console.log("Initializing contract...");

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

    // Save the program ID for frontend
    const config = {
      programId: PROGRAM_ID.toString(),
      authority: authorityKeypair.publicKey.toString(),
      treasury: TREASURY_WALLET.toString(),
      network: "mainnet-beta",
      initialized: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../../mainnet-config.json'),
      JSON.stringify(config, null, 2)
    );
    
    console.log("\n✅ Configuration saved to mainnet-config.json");
    console.log("Update your frontend to use this program ID:", PROGRAM_ID.toString());
    
  } catch (error) {
    console.error("❌ Failed to initialize:", error.message);
    if (error.logs) {
      console.log("Program logs:", error.logs);
    }
  }
}

main().catch(console.error);