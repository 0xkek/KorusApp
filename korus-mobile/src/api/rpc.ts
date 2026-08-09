/**
 * Solana RPC access.
 *
 * Goes through the web app's proxy at korus.fun/api/rpc rather than talking to
 * a public RPC directly, so the Helius key stays server-side — the same route
 * the web client uses. The proxy allowlists methods and rejects cross-origin
 * browser requests; a native client sends no Origin header, so it passes.
 */

const RPC_PROXY_URL = process.env.EXPO_PUBLIC_RPC_URL ?? 'https://korus.fun/api/rpc';

let requestId = 0;

async function rpcCall<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(RPC_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++requestId, method, params }),
  });

  if (!response.ok) {
    throw new Error(`RPC ${method} failed (${response.status})`);
  }

  const data = (await response.json()) as {
    result?: T;
    error?: { message?: string };
  };

  if (data.error) {
    throw new Error(data.error.message ?? `RPC ${method} failed`);
  }
  return data.result as T;
}

export const rpc = {
  getLatestBlockhash: () =>
    rpcCall<{ value: { blockhash: string; lastValidBlockHeight: number } }>(
      'getLatestBlockhash',
      [{ commitment: 'finalized' }]
    ),

  getBalance: (address: string) =>
    rpcCall<{ value: number }>('getBalance', [address, { commitment: 'confirmed' }]),

  /** Returns the transaction signature. */
  sendTransaction: (base64Tx: string) =>
    rpcCall<string>('sendTransaction', [
      base64Tx,
      {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 5,
        encoding: 'base64',
      },
    ]),

  getSignatureStatuses: (signatures: string[]) =>
    rpcCall<{ value: Array<{ confirmationStatus?: string; err?: unknown } | null> }>(
      'getSignatureStatuses',
      [signatures, { searchTransactionHistory: false }]
    ),
};
