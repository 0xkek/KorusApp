import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { KorusGameEscrow } from "../target/types/korus_game_escrow";
import { KorusTipping } from "../target/types/korus_tipping";
import fs from "fs";
import path from "path";

async function main() {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const gameEscrowProgram = anchor.workspace.KorusGameEscrow as Program<KorusGameEscrow>;
  const tippingProgram = anchor.workspace.KorusTipping as Program<KorusTipping>;

  console.log("Deploying Korus contracts...");
  console.log("Network:", provider.connection.rpcEndpoint);
  console.log("Wallet:", provider.wallet.publicKey.toString());

  // Deploy programs (this happens automatically with `anchor deploy`)
  console.log("Game Escrow Program ID:", gameEscrowProgram.programId.toString());
  console.log("Tipping Program ID:", tippingProgram.programId.toString());

  // Initialize Game Escrow
  const [gameStatePda] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("state")],
    gameEscrowProgram.programId
  );

  const treasury = anchor.web3.Keypair.generate();
  console.log("Treasury:", treasury.publicKey.toString());

  try {
    await gameEscrowProgram.methods
      .initialize()
      .accounts({
        state: gameStatePda,
        authority: provider.wallet.publicKey,
        treasury: treasury.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("Game Escrow initialized");
  } catch (error) {
    console.log("Game Escrow already initialized");
  }

  // Initialize Tipping
  const [tippingStatePda] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("state")],
    tippingProgram.programId
  );

  try {
    await tippingProgram.methods
      .initialize()
      .accounts({
        state: tippingStatePda,
        authority: provider.wallet.publicKey,
        treasury: treasury.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("Tipping initialized");
  } catch (error) {
    console.log("Tipping already initialized");
  }

  // Save deployment info
  const deploymentInfo = {
    network: provider.connection.rpcEndpoint,
    gameEscrowProgramId: gameEscrowProgram.programId.toString(),
    tippingProgramId: tippingProgram.programId.toString(),
    treasury: treasury.publicKey.toString(),
    authority: provider.wallet.publicKey.toString(),
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(__dirname, "../deployment.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\nDeployment complete!");
  console.log("Deployment info saved to deployment.json");

  // Export IDLs for frontend
  const gameEscrowIdl = gameEscrowProgram.idl;
  const tippingIdl = tippingProgram.idl;

  fs.writeFileSync(
    path.join(__dirname, "../target/idl/korus_game_escrow.json"),
    JSON.stringify(gameEscrowIdl, null, 2)
  );

  fs.writeFileSync(
    path.join(__dirname, "../target/idl/korus_tipping.json"),
    JSON.stringify(tippingIdl, null, 2)
  );

  console.log("IDLs exported for frontend integration");
}

console.log("Starting deployment...");
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });