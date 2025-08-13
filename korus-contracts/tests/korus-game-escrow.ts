import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { KorusGameEscrow } from "../target/types/korus_game_escrow";
import { 
  createMint, 
  createAssociatedTokenAccount, 
  mintTo, 
  getAccount 
} from "@solana/spl-token";
import { assert } from "chai";

describe("korus-game-escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.KorusGameEscrow as Program<KorusGameEscrow>;
  
  let mint: anchor.web3.PublicKey;
  let treasury: anchor.web3.Keypair;
  let treasuryAta: anchor.web3.PublicKey;
  let statePda: anchor.web3.PublicKey;
  let stateBump: number;

  const creator = anchor.web3.Keypair.generate();
  const opponent = anchor.web3.Keypair.generate();
  
  before(async () => {
    // Airdrop SOL to accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(creator.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(opponent.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
    );

    // Create mint (using USDC-like token)
    mint = await createMint(
      provider.connection,
      creator,
      creator.publicKey,
      null,
      6 // 6 decimals like USDC
    );

    treasury = anchor.web3.Keypair.generate();
    
    // Create treasury ATA
    treasuryAta = await createAssociatedTokenAccount(
      provider.connection,
      creator,
      mint,
      treasury.publicKey
    );

    // Find state PDA
    [statePda, stateBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("state")],
      program.programId
    );
  });

  it("Initializes the program", async () => {
    await program.methods
      .initialize()
      .accounts({
        state: statePda,
        authority: provider.wallet.publicKey,
        treasury: treasury.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const state = await program.account.state.fetch(statePda);
    assert.equal(state.authority.toString(), provider.wallet.publicKey.toString());
    assert.equal(state.treasury.toString(), treasury.publicKey.toString());
    assert.equal(state.totalGames.toNumber(), 0);
    assert.equal(state.platformFeeBps, 250); // 2.5%
  });

  it("Creates a game", async () => {
    // Create ATAs and mint tokens
    const creatorAta = await createAssociatedTokenAccount(
      provider.connection,
      creator,
      mint,
      creator.publicKey
    );

    await mintTo(
      provider.connection,
      creator,
      mint,
      creatorAta,
      creator,
      1_000_000 // 1 USDC
    );

    const gameId = 0;
    const [gamePda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("game"), Buffer.from(gameId.toString())],
      program.programId
    );

    const [escrowPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("escrow"), gamePda.toBuffer()],
      program.programId
    );

    const wagerAmount = new anchor.BN(1_000_000); // 1 USDC
    const gameData = "word:bitcoin";

    await program.methods
      .createGame(
        { guessTheWord: {} }, // GameType enum
        wagerAmount,
        gameData
      )
      .accounts({
        state: statePda,
        game: gamePda,
        escrow: escrowPda,
        creator: creator.publicKey,
        creatorAta: creatorAta,
        mint: mint,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([creator])
      .rpc();

    const game = await program.account.game.fetch(gamePda);
    assert.equal(game.creator.toString(), creator.publicKey.toString());
    assert.equal(game.wagerAmount.toNumber(), wagerAmount.toNumber());
    assert.equal(game.status, 0); // Open
    assert.equal(game.gameData, gameData);

    // Check escrow received funds
    const escrowAccount = await getAccount(provider.connection, escrowPda);
    assert.equal(escrowAccount.amount.toString(), wagerAmount.toString());
  });

  it("Joins a game", async () => {
    const opponentAta = await createAssociatedTokenAccount(
      provider.connection,
      opponent,
      mint,
      opponent.publicKey
    );

    await mintTo(
      provider.connection,
      creator,
      mint,
      opponentAta,
      creator,
      1_000_000 // 1 USDC
    );

    const gameId = 0;
    const [gamePda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("game"), Buffer.from(gameId.toString())],
      program.programId
    );

    const [escrowPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("escrow"), gamePda.toBuffer()],
      program.programId
    );

    await program.methods
      .joinGame()
      .accounts({
        game: gamePda,
        escrow: escrowPda,
        opponent: opponent.publicKey,
        opponentAta: opponentAta,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .signers([opponent])
      .rpc();

    const game = await program.account.game.fetch(gamePda);
    assert.equal(game.opponent.toString(), opponent.publicKey.toString());
    assert.equal(game.status, 1); // Active

    // Check escrow has both wagers
    const escrowAccount = await getAccount(provider.connection, escrowPda);
    assert.equal(escrowAccount.amount.toString(), "2000000"); // 2 USDC
  });

  it("Completes a game", async () => {
    const gameId = 0;
    const [gamePda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("game"), Buffer.from(gameId.toString())],
      program.programId
    );

    const [escrowPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("escrow"), gamePda.toBuffer()],
      program.programId
    );

    const creatorAta = await createAssociatedTokenAccount(
      provider.connection,
      creator,
      mint,
      creator.publicKey
    );

    const opponentAta = await createAssociatedTokenAccount(
      provider.connection,
      opponent,
      mint,
      opponent.publicKey
    );

    const winner = creator.publicKey;

    await program.methods
      .completeGame(winner)
      .accounts({
        game: gamePda,
        state: statePda,
        escrow: escrowPda,
        authority: provider.wallet.publicKey,
        creatorAta: creatorAta,
        opponentAta: opponentAta,
        treasuryAta: treasuryAta,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    const game = await program.account.game.fetch(gamePda);
    assert.equal(game.status, 2); // Completed
    assert.equal(game.winner.toString(), winner.toString());

    // Check winner received funds (minus platform fee)
    const winnerAccount = await getAccount(provider.connection, creatorAta);
    const expectedWinnings = 2_000_000 * 0.975; // 97.5% of pot
    assert.equal(winnerAccount.amount.toString(), Math.floor(expectedWinnings).toString());

    // Check treasury received platform fee
    const treasuryAccount = await getAccount(provider.connection, treasuryAta);
    const expectedFee = 2_000_000 * 0.025; // 2.5% of pot
    assert.equal(treasuryAccount.amount.toString(), Math.floor(expectedFee).toString());
  });
});