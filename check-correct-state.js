const { PublicKey, Connection } = require('@solana/web3.js');

const PROGRAM_ID = new PublicKey("9jsNDSzvsRHH8KUhFwLdEeEKL6nTWhx4YgzmdkhEh1Te");
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

async function checkState() {
  console.log("Checking state for program:", PROGRAM_ID.toString());
  
  const [statePda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("state")],
    PROGRAM_ID
  );
  
  console.log("State PDA:", statePda.toString());
  
  const accountInfo = await connection.getAccountInfo(statePda);
  
  if (accountInfo) {
    console.log("✅ State account exists!");
    console.log("Data length:", accountInfo.data.length);
    console.log("Owner:", accountInfo.owner.toString());
  } else {
    console.log("❌ State account does NOT exist - needs initialization");
  }
}

checkState().catch(console.error);
