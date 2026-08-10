/**
 * Signing an arbitrary message with the connected wallet.
 *
 * Separate from useWalletAuth's sign-in: that proves who you are once, while
 * this proves you approved a specific action — joining a whitelist, for
 * example. The backend verifies these the same way (ed25519 over the raw
 * message bytes, signature base58-encoded).
 */

import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { Buffer } from 'buffer';

const APP_IDENTITY = {
  name: 'Korus',
  uri: 'https://korus.fun',
  icon: 'favicon.ico',
};

const CHAIN = 'solana:mainnet';

/**
 * Returns the base58-encoded signature.
 *
 * Throws if the wallet authorizes a different account than the one signed in,
 * since the backend verifies the signature against the signed-in wallet and
 * would reject it anyway — better to fail with a clear reason.
 */
export async function signMessageWithWallet(
  message: string,
  expectedWallet: string
): Promise<string> {
  return transact(async (wallet) => {
    const authorization = await wallet.authorize({
      chain: CHAIN,
      identity: APP_IDENTITY,
    });

    const account = authorization.accounts[0];
    // MWA returns the address base64-encoded, not base58.
    const authorized = new PublicKey(
      Buffer.from(account.address, 'base64')
    ).toBase58();

    if (authorized !== expectedWallet) {
      throw new Error(
        'The wallet approved a different account than the one signed in. ' +
          'Switch accounts in your wallet, or sign out and reconnect.'
      );
    }

    const signed = await wallet.signMessages({
      addresses: [account.address],
      payloads: [Buffer.from(message, 'utf8')],
    });

    // signMessages returns the message with the 64-byte signature appended.
    const withSignature = signed[0];
    const signature = withSignature.slice(withSignature.length - 64);
    return bs58.encode(signature);
  });
}
