const anchor = require("@coral-xyz/anchor");
const { SystemProgram, Keypair, PublicKey, Connection } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

// Program ID from deployment
const PROGRAM_ID = new PublicKey("3LyQkgPsjogtfv38YWashEJieyjnyoZeK6MPNmzdDz4Q");

// Treasury wallet (platform fee recipient)
const TREASURY_WALLET = new PublicKey("7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY");

async function main() {
  // Configure the client - use backend authority for initialization
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  // Load the backend authority keypair (the one that will control game completions)
  const authorityKeypairPath = path.join(__dirname, "../../authority-keypair.json");
  let authorityKeypair;
  
  if (fs.existsSync(authorityKeypairPath)) {
    const keypairData = JSON.parse(fs.readFileSync(authorityKeypairPath, 'utf-8'));
    authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
    console.log("Using backend authority:", authorityKeypair.publicKey.toString());
  } else {
    console.error("❌ Backend authority keypair not found!");
    console.error("Please create one with: solana-keygen new -o authority-keypair.json");
    process.exit(1);
  }
  
  const wallet = new anchor.Wallet(authorityKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Load the IDL (we'll create a minimal one)
  const idl = {
    version: "0.1.0",
    name: "korus_game_escrow",
    instructions: [
      {
        name: "initialize",
        accounts: [
          { name: "state", isMut: true, isSigner: false },
          { name: "authority", isMut: true, isSigner: true },
          { name: "systemProgram", isMut: false, isSigner: false }
        ],
        args: [
          { name: "treasury", type: "publicKey" }
        ]
      }
    ],
    accounts: [
      {
        name: "State",
        type: {
          kind: "struct",
          fields: [
            { name: "authority", type: "publicKey" },
            { name: "treasury", type: "publicKey" },
            { name: "totalGames", type: "u64" },
            { name: "totalVolume", type: "u64" },
            { name: "platformFeeBps", type: "u16" },
            { name: "activeGames", type: "u64" }
          ]
        }
      }
    ]
  };

  const program = new anchor.Program(idl, PROGRAM_ID, provider);

  try {
    // Derive the state PDA
    const [statePda] = await PublicKey.findProgramAddress(
      [Buffer.from("state")],
      PROGRAM_ID
    );

    // Check if already initialized
    try {
      const state = await program.account.state.fetch(statePda);
      console.log("Contract already initialized!");
      console.log("Authority:", state.authority.toString());
      console.log("Treasury:", state.treasury.toString());
      console.log("Total Games:", state.totalGames.toString());
      console.log("Platform Fee:", state.platformFeeBps, "bps (", state.platformFeeBps / 100, "%)");
      return;
    } catch (e) {
      console.log("Contract not initialized yet, proceeding...");
    }

    // Initialize the contract
    console.log("Initializing contract...");
    console.log("State PDA:", statePda.toString());
    console.log("Authority:", provider.wallet.publicKey.toString());
    console.log("Treasury:", TREASURY_WALLET.toString());

    const tx = await program.methods
      .initialize(TREASURY_WALLET)
      .accounts({
        state: statePda,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Contract initialized successfully!");
    console.log("Transaction signature:", tx);
    
    // Fetch and display the initialized state
    const state = await program.account.state.fetch(statePda);
    console.log("\n📊 Initialized State:");
    console.log("Authority:", state.authority.toString());
    console.log("Treasury:", state.treasury.toString());
    console.log("Platform Fee:", state.platformFeeBps, "bps");
    
  } catch (error) {
    console.error("Error initializing contract:", error);
  }
}

console.log("🚀 Korus Game Escrow Initialization Script");
console.log("=========================================");
main();