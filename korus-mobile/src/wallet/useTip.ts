/**
 * Sending a SOL tip.
 *
 * Three steps, in order, and all three must succeed for a tip to count:
 *   1. Build a SystemProgram.transfer and have the wallet sign AND send it.
 *   2. Wait for the signature to confirm on-chain.
 *   3. Report the signature to the backend, which independently re-verifies it
 *      against mainnet before recording the tip.
 *
 * The backend's rules shape this: the transfer must be under 5 minutes old
 * when reported, the recipient must gain at least (amount - 0.001) SOL, and a
 * signature can only be redeemed once. Step 3 failing does NOT undo step 1 —
 * the SOL has already moved — so that case is reported distinctly.
 */

import { useCallback, useState } from 'react';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { Buffer } from 'buffer';
import { postsAPI } from '../api/posts';
import { rpc } from '../api/rpc';

const APP_IDENTITY = {
  name: 'Korus',
  uri: 'https://korus.fun',
  icon: 'favicon.ico',
};

const CHAIN = 'solana:mainnet';

/** Network fee headroom so a tip cannot leave the account unable to pay fees. */
const FEE_BUFFER_SOL = 0.001;

export interface TipResult {
  signature: string;
  /** True when the transfer landed but the backend did not record it. */
  recordedOnBackend: boolean;
}

export function useTip() {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendTip = useCallback(
    async (params: {
      postId: string;
      recipientWallet: string;
      amountSol: number;
      senderWallet: string;
      token: string;
    }): Promise<TipResult | null> => {
      const { postId, recipientWallet, amountSol, senderWallet, token } = params;
      setIsSending(true);
      setError(null);

      try {
        const recipient = new PublicKey(recipientWallet);
        const sender = new PublicKey(senderWallet);
        const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

        // Fail before opening the wallet if the balance clearly cannot cover
        // the transfer plus fees — cheaper than a rejected signature.
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

          // The wallet could authorize a different account than the one signed
          // in to Korus; the backend verifies the sender, so a mismatch would
          // move SOL and then fail to record.
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

        // The backend rejects transactions it cannot find on-chain, so wait for
        // confirmation before reporting it.
        await waitForConfirmation(signature);

        try {
          await postsAPI.tipPost(postId, amountSol, signature, token);
          return { signature, recordedOnBackend: true };
        } catch {
          // The SOL has moved. Surface this honestly rather than as a failure.
          setError(
            'Your SOL was sent, but Korus could not record the tip. ' +
              `Transaction: ${signature.slice(0, 12)}…`
          );
          return { signature, recordedOnBackend: false };
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const declined = /decline|reject|cancel|dismiss/i.test(message);
        setError(declined ? null : message);
        return null;
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  return { sendTip, isSending, error, clearError: () => setError(null) };
}

/** Poll until the signature confirms, or give up after ~30s. */
async function waitForConfirmation(signature: string): Promise<void> {
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
