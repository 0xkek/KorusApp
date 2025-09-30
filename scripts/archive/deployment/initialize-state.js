#!/usr/bin/env node

// Initialize the game escrow program state on devnet
const { Connection, PublicKey, Transaction, SystemProgram, Keypair, TransactionInstruction } = require('@solana/web3.js');
const fs = require('fs');

const PROGRAM_ID = new PublicKey('4iUdAkPRmZLzUFXTLpt5QPGmUUtP6yfgpPpF3sLD9xtd');
const DEVNET_URL = 'https://api.devnet.solana.com';

async function main() {
    console.log('🚀 Initializing Korus Game Escrow Program State on Devnet...');

    // Load authority keypair
    const authorityKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync('/Users/maxattard/KorusApp/authority-keypair.json')))
    );

    console.log('📝 Authority:', authorityKeypair.publicKey.toBase58());

    // Connect to devnet
    const connection = new Connection(DEVNET_URL, 'confirmed');

    // Check balance
    const balance = await connection.getBalance(authorityKeypair.publicKey);
    console.log('💰 Authority balance:', balance / 1e9, 'SOL');

    if (balance < 0.1 * 1e9) {
        console.log('💸 Requesting airdrop...');
        const sig = await connection.requestAirdrop(authorityKeypair.publicKey, 1e9);
        await connection.confirmTransaction(sig);
        console.log('✅ Airdrop confirmed');
    }

    // Derive state PDA
    const [statePda, bump] = await PublicKey.findProgramAddress(
        [Buffer.from('state')],
        PROGRAM_ID
    );

    console.log('🔑 State PDA:', statePda.toBase58());

    // Check if state already exists
    try {
        const stateAccount = await connection.getAccountInfo(statePda);
        if (stateAccount) {
            console.log('✅ State account already exists!');
            console.log('   Data length:', stateAccount.data.length);
            console.log('   Owner:', stateAccount.owner.toBase58());
            return;
        }
    } catch (error) {
        console.log('📭 State account does not exist, initializing...');
    }

    // Build initialization transaction manually (since we don't have IDL)
    const transaction = new Transaction();

    // Treasury address (same as authority for now)
    const treasury = authorityKeypair.publicKey;

    // Create initialize instruction
    const initializeIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
            { pubkey: statePda, isSigner: false, isWritable: true },
            { pubkey: authorityKeypair.publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([
            Buffer.from([0]), // Instruction discriminator for initialize
            treasury.toBuffer() // Treasury public key
        ])
    });

    transaction.add(initializeIx);
    transaction.feePayer = authorityKeypair.publicKey;

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    console.log('📤 Sending initialize transaction...');

    try {
        const signature = await connection.sendTransaction(transaction, [authorityKeypair]);
        console.log('🔄 Transaction sent:', signature);

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');

        if (confirmation.value.err) {
            throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
        }

        console.log('✅ State initialized successfully!');
        console.log('🎉 Program is ready for game transactions');

        // Verify state was created
        const stateAccount = await connection.getAccountInfo(statePda);
        console.log('📊 Final state account:', {
            exists: !!stateAccount,
            dataLength: stateAccount?.data.length,
            owner: stateAccount?.owner.toBase58()
        });

    } catch (error) {
        console.error('❌ Failed to initialize state:', error);

        // Try to get more info about the error
        if (error.logs) {
            console.error('📋 Transaction logs:');
            error.logs.forEach(log => console.error('   ', log));
        }
    }
}

main().catch(console.error);