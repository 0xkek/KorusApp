/**
 * Sending SOL through Mobile Wallet Adapter.
 *
 * Shared by every paid action — tips, subscriptions, shoutouts — because the
 * backend verifies all of them the same way: it looks up the signature on
 * mainnet and checks the recipient gained the expected amount. Getting this
 * wrong moves real money, so there is one implementation rather than three.
 */

import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { Buffer } from 'buffer';
import { rpc } from '../api/rpc';

const APP_IDENTITY = {
  name: 'Korus',
  uri: 'https://korus.fun',
  icon: 'favicon.ico',
};

const CHAIN = 'solana:mainnet';

/** Network fee headroom, so a transfer cannot leave the account unable to pay. */
const FEE_BUFFER_SOL = 0.001;

/**
 * Builds, signs, sends and confirms a SOL transfer.
 *
 * Returns the signature once confirmed on-chain. Throws before anything is
 * signed when the balance is short or the wallet approves a different account
 * than the one signed in — the latter matters because the backend verifies the
 * sender, so a mismatch would move SOL and then be refused.
 */
export async function sendSol(params: {
  senderWallet: string;
  recipientWallet: string;
  amountSol: number;
}): Promise<string> {
  const { senderWallet, recipientWallet, amountSol } = params;

  const recipient = new PublicKey(recipientWallet);
  const sender = new PublicKey(senderWallet);
  const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

  // Cheaper to fail here than to open the wallet and have it rejected.
  const balance = await rpc.getBalance(senderWallet);
  const needed = lamports + Math.floor(FEE_BUFFER_SOL * LAMPORTS_PER_SOL);
  if (balance.value < needed) {
    throw new Error(
      `Not enough SOL. You have ${(balance.value / LAMPORTS_PER_SOL).toFixed(4)}, ` +
        `and this needs about ${(needed / LAMPORTS_PER_SOL).toFixed(4)} including fees.`
    );
  }

  const { value: blockhashInfo } = await rpc.getLatestBlockhash();

  const signature = await transact(async (wallet) => {
    const authorization = await wallet.authorize({
      chain: CHAIN,
      identity: APP_IDENTITY,
    });

    // MWA base64-encodes addresses.
    const account = authorization.accounts[0];
    const authorized = new PublicKey(
      Buffer.from(account.address, 'base64')
    ).toBase58();

    if (authorized !== senderWallet) {
      throw new Error(
        'The wallet approved a different account than the one signed in. ' +
          'Switch accounts in your wallet, or sign out and reconnect.'
      );
    }

    const transaction = new Transaction();
    transaction.recentBlockhash = blockhashInfo.blockhash;
    transaction.feePayer = sender;
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: recipient,
        lamports,
      })
    );

    const signatures = await wallet.signAndSendTransactions({
      transactions: [transaction],
    });
    return signatures[0];
  });

  // The backend rejects signatures it cannot find on-chain, so confirm before
  // reporting it.
  await waitForConfirmation(signature);
  return signature;
}

/** Poll until the signature confirms, or give up after ~30s. */
export async function waitForConfirmation(signature: string): Promise<void> {
  for (let attempt = 0; attempt < 15; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    try {
      const status = await rpc.getSignatureStatuses([signature]);
      const info = status.value?.[0];
      if (info?.err) {
        throw new Error('The transaction failed on-chain.');
      }
      if (
        info?.confirmationStatus === 'confirmed' ||
        info?.confirmationStatus === 'finalized'
      ) {
        return;
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('failed on-chain')) throw err;
      // Otherwise keep polling — transient RPC errors are expected.
    }
  }
  // Not fatal: the backend retries lookups for a while too.
}

/** True when the user dismissed the wallet sheet rather than hitting a fault. */
export function isUserDeclined(message: string): boolean {
  return /decline|reject|cancel|dismiss/i.test(message);
}
