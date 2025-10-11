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

// Deployed Program ID on devnet
const PROGRAM_ID = new PublicKey("4iUdAkPRmZLzUFXTLpt5QPGmUUtP6yfgpPpF3sLD9xtd");
const TREASURY_WALLET = new PublicKey("ByqqYGErKfyLHHd3NjgMnbbxQdPs1kFrPVWPUHUsD31W");

async function main() {
  console.log("🚀 Korus Game Escrow Initialization (DEVNET)");
  console.log("=============================================");

  // Load authority keypair
  const authorityKeypairPath = path.join(__dirname, "../../authority-keypair.json");
  const keypairData = JSON.parse(fs.readFileSync(authorityKeypairPath, 'utf-8'));
  const authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  console.log("Authority:", authorityKeypair.publicKey.toString());
  console.log("Treasury:", TREASURY_WALLET.toString());
  console.log("Program ID:", PROGRAM_ID.toString());

  // Connect to devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Get balance
  const balance = await connection.getBalance(authorityKeypair.publicKey);
  console.log("Authority balance:", balance / 1e9, "SOL");

  if (balance < 0.01 * 1e9) {
    console.error("❌ Insufficient balance! Need at least 0.01 SOL");
    console.log("💡 Request devnet SOL from: https://faucet.solana.com");
    return;
  }

  // Derive state PDA
  const [statePda, bump] = await PublicKey.findProgramAddress(
    [Buffer.from("state")],
    PROGRAM_ID
  );

  console.log("State PDA:", statePda.toString());
  console.log("Bump:", bump);

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

  console.log("\n📝 Initializing contract...\n");

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
    console.log("Explorer:", `https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    // Verify initialization
    const newAccountInfo = await connection.getAccountInfo(statePda);
    if (newAccountInfo) {
      console.log("State account created, size:", newAccountInfo.data.length, "bytes");

      // Parse and display initial state
      const data = newAccountInfo.data;
      const authority = new PublicKey(data.slice(8, 40));
      const treasury = new PublicKey(data.slice(40, 72));

      console.log("\n📊 Contract State:");
      console.log("  Authority:", authority.toString());
      console.log("  Treasury:", treasury.toString());
    }
  } catch (error) {
    console.error("\n❌ Failed to initialize:", error.message);
    if (error.logs) {
      console.log("\n📋 Program logs:");
      error.logs.forEach(log => console.log("  ", log));
    }
  }
}

main().catch(console.error);
