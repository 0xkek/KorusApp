/**
 * Sending a SOL tip.
 *
 * Three steps, in order, and all three must succeed for a tip to count:
 *   1. Transfer the SOL (see sendSol — signs, sends and confirms).
 *   2. Report the signature to the backend, which independently re-verifies it
 *      against mainnet.
 *
 * The backend's rules shape this: the transfer must be under 5 minutes old
 * when reported, the recipient must gain at least (amount - 0.001) SOL, and a
 * signature can only be redeemed once. Step 2 failing does NOT undo step 1 —
 * the SOL has already moved — so that case is reported distinctly.
 */

import { useCallback, useState } from 'react';
import { postsAPI } from '../api/posts';
import { isUserDeclined, sendSol } from './solTransfer';

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
        const signature = await sendSol({
          senderWallet,
          recipientWallet,
          amountSol,
        });

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
        setError(isUserDeclined(message) ? null : message);
        return null;
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  return { sendTip, isSending, error, clearError: () => setError(null) };
}
