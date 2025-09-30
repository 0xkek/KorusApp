const { PublicKey, Connection } = require('@solana/web3.js');

const PROGRAM_ID = new PublicKey("9jsNDSzvsRHH8KUhFwLdEeEKL6nTWhx4YgzmdkhEh1Te");
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

async function getNextGameId() {
  try {
    // Get state PDA
    const [statePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('state')],
      PROGRAM_ID
    );

    console.log("State PDA:", statePda.toString());

    // Get state account
    const stateAccount = await connection.getAccountInfo(statePda);

    if (!stateAccount) {
      console.log("State not initialized");
      return null;
    }

    // Parse state data
    // State structure:
    // - discriminator: 8 bytes
    // - authority: 32 bytes
    // - treasury: 32 bytes
    // - total_games: 8 bytes (u64)

    const data = stateAccount.data;
    const totalGamesOffset = 8 + 32 + 32; // Skip discriminator, authority, treasury
    const totalGames = data.readBigUInt64LE(totalGamesOffset);

    console.log("Current total games:", totalGames.toString());
    console.log("Next game ID should be:", totalGames.toString());

    // Calculate the PDA for the next game
    const gameIdBuffer = Buffer.alloc(8);
    gameIdBuffer.writeBigUInt64LE(totalGames);

    const [gamePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('game'), gameIdBuffer],
      PROGRAM_ID
    );

    console.log("Next game PDA:", gamePda.toString());

    return totalGames;

  } catch (error) {
    console.error("Error:", error);
  }
}

getNextGameId();