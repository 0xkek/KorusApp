const anchor = require("@coral-xyz/anchor");
const { SystemProgram, PublicKey } = require("@solana/web3.js");

async function main() {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Program ID
  const programId = new PublicKey("9jsNDSzvsRHH8KUhFwLdEeEKL6nTWhx4YgzmdkhEh1Te");

  // Treasury wallet (use the same as authority for now)
  const treasury = provider.wallet.publicKey;

  // Derive state PDA
  const [statePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("state")],
    programId
  );

  // Create the initialization instruction manually
  const initIx = new anchor.web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: statePda, isSigner: false, isWritable: true },
      { pubkey: provider.wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      Buffer.from([0xaf, 0xaf, 0x6d, 0x1f, 0x0d, 0x98, 0x9b, 0xed]), // Initialize discriminator
      treasury.toBuffer(), // Treasury pubkey
    ]),
  });

  // Send transaction
  const tx = new anchor.web3.Transaction().add(initIx);

  try {
    const sig = await provider.sendAndConfirm(tx);
    console.log("✅ Contract initialized successfully!");
    console.log("Signature:", sig);
    console.log("State PDA:", statePda.toString());
    console.log("Treasury:", treasury.toString());
    console.log("Authority:", provider.wallet.publicKey.toString());
  } catch (err) {
    if (err.toString().includes("already in use")) {
      console.log("Contract already initialized!");
      console.log("State PDA:", statePda.toString());
    } else {
      console.error("Error:", err);
    }
  }
}

main().catch(console.error);