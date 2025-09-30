const { PublicKey, Connection } = require('@solana/web3.js');
const { BN } = require('@coral-xyz/anchor');

const PROGRAM_ID = new PublicKey("9jsNDSzvsRHH8KUhFwLdEeEKL6nTWhx4YgzmdkhEh1Te");
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

async function checkGames() {
  console.log("🎮 CHECKING GAMES ON BLOCKCHAIN");
  console.log("=====================================\n");

  // Get state to know how many games exist
  const [statePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('state')],
    PROGRAM_ID
  );

  const stateAccount = await connection.getAccountInfo(statePda);
  if (!stateAccount) {
    console.log("❌ State not initialized");
    return;
  }

  const totalGamesOffset = 72;
  const totalGames = Number(stateAccount.data.readBigUInt64LE(totalGamesOffset));
  const totalVolume = Number(stateAccount.data.readBigUInt64LE(80)) / 1e9; // Convert to SOL
  const activeGames = Number(stateAccount.data.readBigUInt64LE(88));

  console.log("📊 OVERALL STATS:");
  console.log(`   Total Games Created: ${totalGames}`);
  console.log(`   Total Volume: ${totalVolume.toFixed(4)} SOL`);
  console.log(`   Active Games: ${activeGames}`);
  console.log("");

  // Check each game
  for (let i = 0; i < totalGames; i++) {
    const gameId = new BN(i);
    const [gamePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('game'), gameId.toArrayLike(Buffer, 'le', 8)],
      PROGRAM_ID
    );

    const gameAccount = await connection.getAccountInfo(gamePda);

    if (gameAccount) {
      console.log(`📱 GAME ${i}:`);

      // Parse game data
      const data = gameAccount.data;

      // Skip discriminator (8 bytes)
      let offset = 8;

      // Game ID (8 bytes)
      const gameIdFromChain = data.readBigUInt64LE(offset);
      offset += 8;

      // Game type (1 byte)
      const gameType = data.readUInt8(offset);
      const gameTypeNames = ['TicTacToe', 'RockPaperScissors', 'Connect4', 'CoinFlip'];
      offset += 1;

      // Player 1 (32 bytes)
      const player1 = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      // Player 2 (32 bytes)
      const player2 = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      // Wager amount (8 bytes)
      const wagerAmount = Number(data.readBigUInt64LE(offset)) / 1e9; // Convert to SOL
      offset += 8;

      // Status (1 byte)
      const status = data.readUInt8(offset);
      const statusNames = ['Waiting', 'Active', 'Completed', 'Cancelled'];
      offset += 1;

      // Winner (32 bytes)
      const winner = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      // Check escrow balance
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), gamePda.toBuffer()],
        PROGRAM_ID
      );

      const escrowBalance = await connection.getBalance(escrowPda) / 1e9;

      console.log(`   Type: ${gameTypeNames[gameType] || 'Unknown'}`);
      console.log(`   Status: ${statusNames[status] || 'Unknown'}`);
      console.log(`   Wager: ${wagerAmount} SOL`);
      console.log(`   Player 1: ${player1.toString().slice(0, 8)}...`);
      console.log(`   Player 2: ${player2.equals(PublicKey.default) ? 'Waiting for opponent' : player2.toString().slice(0, 8) + '...'}`);
      if (!winner.equals(PublicKey.default)) {
        console.log(`   Winner: ${winner.toString().slice(0, 8)}...`);
      }
      console.log(`   Escrow Balance: ${escrowBalance} SOL`);
      console.log("");
    } else {
      console.log(`❌ Game ${i}: Account not found`);
    }
  }

  // Check recent transactions
  console.log("📜 RECENT GAME TRANSACTIONS:");
  const signatures = await connection.getSignaturesForAddress(PROGRAM_ID, { limit: 5 });

  for (const sig of signatures) {
    const date = new Date(sig.blockTime * 1000);
    console.log(`   ${sig.signature.slice(0, 12)}... - ${date.toLocaleString()}`);
  }
}

checkGames().catch(console.error);