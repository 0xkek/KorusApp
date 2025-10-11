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
const crypto = require('crypto');

// Deployed Program ID on devnet
const PROGRAM_ID = new PublicKey("4iUdAkPRmZLzUFXTLpt5QPGmUUtP6yfgpPpF3sLD9xtd");

async function main() {
  const gameIdArg = process.argv[2];
  const walletPath = process.argv[3];

  if (!gameIdArg || !walletPath) {
    console.error("Usage: node cancel-game.js <GAME_ID> <WALLET_KEYPAIR_PATH>");
    console.error("Example: node cancel-game.js 0 ~/.config/solana/id.json");
    process.exit(1);
  }

  const gameId = parseInt(gameIdArg);

  console.log("🚫 Cancelling game", gameId);
  console.log("=".repeat(50));

  // Load wallet keypair
  const keypairData = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf-8'));
  const playerKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  console.log("Player:", playerKeypair.publicKey.toString());

  // Connect to devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Get balance
  const balance = await connection.getBalance(playerKeypair.publicKey);
  console.log("Balance:", balance / 1e9, "SOL");

  // Derive PDAs
  const [statePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("state")],
    PROGRAM_ID
  );

  const gameIdBuffer = Buffer.alloc(8);
  gameIdBuffer.writeBigUInt64LE(BigInt(gameId));
  const [gamePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("game"), gameIdBuffer],
    PROGRAM_ID
  );

  const [playerStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("player"), playerKeypair.publicKey.toBuffer()],
    PROGRAM_ID
  );

  const [escrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), gamePda.toBuffer()],
    PROGRAM_ID
  );

  console.log("\nPDAs:");
  console.log("  State:", statePda.toString());
  console.log("  Game:", gamePda.toString());
  console.log("  Player State:", playerStatePda.toString());
  console.log("  Escrow:", escrowPda.toString());

  // Create cancel_game instruction
  // Discriminator: SHA256("global:cancel_game")[:8]
  const discriminatorHash = crypto.createHash('sha256').update('global:cancel_game').digest();
  const discriminator = discriminatorHash.slice(0, 8);

  console.log("\nDiscriminator:", Array.from(discriminator));

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: statePda, isSigner: false, isWritable: true },
      { pubkey: gamePda, isSigner: false, isWritable: true },
      { pubkey: playerStatePda, isSigner: false, isWritable: true },
      { pubkey: escrowPda, isSigner: false, isWritable: true },
      { pubkey: playerKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: discriminator,
  });

  // Create and send transaction
  const transaction = new Transaction().add(instruction);

  try {
    console.log("\n📤 Sending cancel transaction...");
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [playerKeypair],
      { commitment: 'confirmed' }
    );

    console.log("✅ Game cancelled successfully!");
    console.log("Transaction signature:", signature);
    console.log("Explorer:", `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  } catch (error) {
    console.error("\n❌ Failed to cancel game:", error.message);
    if (error.logs) {
      console.log("\n📋 Program logs:");
      error.logs.forEach(log => console.log("  ", log));
    }
  }
}

main().catch(console.error);
