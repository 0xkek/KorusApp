const {
  Connection,
  PublicKey,
} = require('@solana/web3.js');

// Deployed Program ID on devnet
const PROGRAM_ID = new PublicKey("4iUdAkPRmZLzUFXTLpt5QPGmUUtP6yfgpPpF3sLD9xtd");

async function main() {
  // Get player wallet from command line arg
  const playerPubkey = process.argv[2];
  if (!playerPubkey) {
    console.error("Usage: node check-player-state.js <PLAYER_PUBKEY>");
    process.exit(1);
  }

  console.log("🔍 Checking player state for:", playerPubkey);
  console.log("=".repeat(50));

  // Connect to devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Derive player state PDA
  const [playerStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("player"), new PublicKey(playerPubkey).toBuffer()],
    PROGRAM_ID
  );

  console.log("Player State PDA:", playerStatePda.toString());

  // Get account info
  const accountInfo = await connection.getAccountInfo(playerStatePda);

  if (!accountInfo || accountInfo.data.length === 0) {
    console.log("✅ No player state found - player has no active games");
    return;
  }

  console.log("Account found, size:", accountInfo.data.length, "bytes");
  console.log("\nRaw data (hex):", accountInfo.data.toString('hex'));

  // Parse PlayerState
  // Layout: discriminator(8) + player(32) + has_active_game(1) + current_game_id(9 = 1 byte option + 8 bytes u64)
  const data = accountInfo.data;

  const player = new PublicKey(data.slice(8, 40));
  const hasActiveGame = data.readUInt8(40) === 1;

  let currentGameId = null;
  if (data.length > 41 && data.readUInt8(41) === 1) {
    // Option is Some
    currentGameId = Number(data.readBigUInt64LE(42));
  }

  console.log("\n📊 Player State:");
  console.log("  Player:", player.toString());
  console.log("  Has Active Game:", hasActiveGame);
  console.log("  Current Game ID:", currentGameId !== null ? currentGameId : "None");

  if (hasActiveGame && currentGameId !== null) {
    // Check game details
    const gameIdBuffer = Buffer.alloc(8);
    gameIdBuffer.writeBigUInt64LE(BigInt(currentGameId));
    const [gamePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("game"), gameIdBuffer],
      PROGRAM_ID
    );

    console.log("\n🎮 Game Details:");
    console.log("  Game PDA:", gamePda.toString());

    const gameAccount = await connection.getAccountInfo(gamePda);
    if (gameAccount) {
      const gameData = gameAccount.data;
      // Game layout: discriminator(8) + game_id(8) + game_type(1) + player1(32) + player2(32) + wager_amount(8) + status(1) + ...
      const gameId = Number(gameData.readBigUInt64LE(8));
      const gameType = gameData.readUInt8(16);
      const player1 = new PublicKey(gameData.slice(17, 49));
      const player2 = new PublicKey(gameData.slice(49, 81));
      const wagerAmount = Number(gameData.readBigUInt64LE(81));
      const status = gameData.readUInt8(89);

      const gameTypes = ['TicTacToe', 'RPS', 'ConnectFour'];
      const statuses = ['Waiting', 'Active', 'Completed', 'Cancelled'];

      console.log("  Game ID:", gameId);
      console.log("  Game Type:", gameTypes[gameType] || gameType);
      console.log("  Player 1:", player1.toString());
      console.log("  Player 2:", player2.toString());
      console.log("  Wager Amount:", wagerAmount / 1e9, "SOL");
      console.log("  Status:", statuses[status] || status);

      if (status === 0) {
        console.log("\n💡 Game is in 'Waiting' status. You can cancel it to create a new game.");
      }
    }
  }
}

main().catch(console.error);
