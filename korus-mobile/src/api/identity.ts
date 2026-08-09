import { api } from './client';

/**
 * SNS domains and NFTs owned by a wallet — the two sources for a Korus
 * identity beyond a custom username.
 *
 * Both are public reads that hit chain indexers server-side, so they are
 * slower than the rest of the API and worth loading lazily.
 */

export interface SNSDomain {
  domain: string;
  owner: string;
  favorite: boolean;
}

export interface WalletNFT {
  name: string;
  symbol: string;
  uri: string;
  image: string;
  mint: string;
  updateAuthority?: string;
}

export const identityAPI = {
  getDomains: (wallet: string) =>
    api.get<{ success: boolean; domains: SNSDomain[]; count: number }>(
      `/api/sns/domains/${wallet}`
    ),

  getNFTs: (wallet: string) =>
    api.get<{ success: boolean; nfts: WalletNFT[]; count?: number }>(
      `/api/nfts/wallet/${wallet}`
    ),
};

/**
 * The backend stores nftAvatar as the NFT's *mint address*, not its image URL,
 * and resolves it when serving posts. Send the mint when saving.
 */
export const WALLET_IDENTITY = '__wallet__';
