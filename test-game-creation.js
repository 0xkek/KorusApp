const { PublicKey, Connection, Keypair, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction, LAMPORTS_PER_SOL, ComputeBudgetProgram } = require('@solana/web3.js');
const { BN } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

const PROGRAM_ID = new PublicKey("9jsNDSzvsRHH8KUhFwLdEeEKL6nTWhx4YgzmdkhEh1Te");
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

async function testCreateGame() {
  try {
    console.log("🎮 Testing Game Creation on Devnet");
    console.log("=====================================");

    // Load test wallet (make sure you have a funded devnet wallet)
    const walletPath = path.join(require('os').homedir(), '.config/solana/id.json');
    if (!fs.existsSync(walletPath)) {
      console.error("❌ No wallet found at ~/.config/solana/id.json");
      console.log("Please create a wallet: solana-keygen new");
      return;
    }

    const walletKeypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
    );

    console.log("👛 Wallet:", walletKeypair.publicKey.toString());

    // Check balance
    const balance = await connection.getBalance(walletKeypair.publicKey);
    console.log("💰 Balance:", balance / LAMPORTS_PER_SOL, "SOL");

    if (balance < 0.02 * LAMPORTS_PER_SOL) {
      console.error("❌ Insufficient balance. Need at least 0.02 SOL");
      console.log("Get devnet SOL: solana airdrop 1");
      return;
    }

    // Game parameters
    const gameType = 0; // TicTacToe
    const wagerAmount = 0.01 * LAMPORTS_PER_SOL;

    // Get state PDA to read next game ID
    const [statePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('state')],
      PROGRAM_ID
    );

    // Get current game counter from state
    const stateAccount = await connection.getAccountInfo(statePda);
    if (!stateAccount) {
      console.error("❌ Game escrow state not initialized");
      return;
    }

    // Parse total_games from state (offset: 8 + 32 + 32 = 72)
    const totalGamesOffset = 72;
    const gameId = new BN(stateAccount.data.readBigUInt64LE(totalGamesOffset).toString());

    console.log("\n📝 Game Details:");
    console.log("   Type: TicTacToe");
    console.log("   Wager:", wagerAmount / LAMPORTS_PER_SOL, "SOL");
    console.log("   Game ID:", gameId.toString());

    const [gamePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('game'), gameId.toArrayLike(Buffer, 'le', 8)],
      PROGRAM_ID
    );

    const [playerStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('player'), walletKeypair.publicKey.toBuffer()],
      PROGRAM_ID
    );

    const [escrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), gamePda.toBuffer()],
      PROGRAM_ID
    );

    console.log("\n🔑 PDAs:");
    console.log("   State:", statePda.toString());
    console.log("   Game:", gamePda.toString());
    console.log("   Player State:", playerStatePda.toString());
    console.log("   Escrow:", escrowPda.toString());

    // Create transaction
    const transaction = new Transaction();
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletKeypair.publicKey;

    // Add priority fee
    const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 10000
    });
    transaction.add(priorityFeeIx);

    // Step 1: Transfer SOL to escrow
    console.log("\n💸 Transferring", wagerAmount / LAMPORTS_PER_SOL, "SOL to escrow...");
    const transferIx = SystemProgram.transfer({
      fromPubkey: walletKeypair.publicKey,
      toPubkey: escrowPda,
      lamports: wagerAmount,
    });
    transaction.add(transferIx);

    // Step 2: Create game instruction
    console.log("🎯 Creating game on-chain...");
    const discriminator = Buffer.from([124, 69, 75, 66, 184, 220, 72, 206]); // create_game
    const gameTypeBuffer = Buffer.alloc(1);
    gameTypeBuffer.writeUInt8(gameType);
    const wagerBuffer = Buffer.alloc(8);
    wagerBuffer.writeBigUInt64LE(BigInt(wagerAmount));

    const instructionData = Buffer.concat([
      discriminator,
      gameTypeBuffer,
      wagerBuffer
    ]);

    const createGameIx = new TransactionInstruction({
      keys: [
        { pubkey: statePda, isSigner: false, isWritable: true },
        { pubkey: gamePda, isSigner: false, isWritable: true },
        { pubkey: playerStatePda, isSigner: false, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });
    transaction.add(createGameIx);

    // Send transaction
    console.log("\n📡 Sending transaction...");
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [walletKeypair],
      { commitment: 'confirmed' }
    );

    console.log("\n✅ Game created successfully!");
    console.log("📜 Transaction:", signature);
    console.log("🔗 View on Solscan: https://solscan.io/tx/" + signature + "?cluster=devnet");

    // Verify game was created
    console.log("\n🔍 Verifying game state...");
    const gameAccount = await connection.getAccountInfo(gamePda);

    if (gameAccount) {
      console.log("✅ Game account exists on-chain!");
      console.log("   Size:", gameAccount.data.length, "bytes");
      console.log("   Owner:", gameAccount.owner.toString());
    } else {
      console.log("❌ Game account not found");
    }

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.logs) {
      console.error("📋 Program logs:");
      error.logs.forEach(log => console.error("  ", log));
    }
  }
}

testCreateGame();