import { api } from './client';

/**
 * Premium subscription.
 *
 * Payment is a plain SOL transfer to the Korus treasury, reported here with
 * its signature; the backend re-verifies it on mainnet before activating.
 *
 * The treasury address mirrors korus-web (NEXT_PUBLIC_TREASURY_WALLET with the
 * same default) and must match TREASURY_WALLET on the backend, which is what
 * the payment is checked against.
 */
export const TREASURY_WALLET =
  process.env.EXPO_PUBLIC_TREASURY_WALLET ??
  'ByqqYGErKfyLHHd3NjgMnbbxQdPs1kFrPVWPUHUsD31W';

export interface SubscriptionTier {
  price: number;
  currency: string;
  duration: string;
  savings?: string;
  features: string[];
}

/**
 * Shape verified against production — the response is flat, not nested under
 * a `subscription` key, and uses these names rather than the column names.
 */
export interface SubscriptionStatus {
  hasSubscription: boolean;
  status: string | null;
  isPremium: boolean;
  daysUntilExpiration: number | null;
  subscriptionType?: string | null;
  expiresAt?: string | null;
}

export const subscriptionAPI = {
  getPricing: () =>
    api.get<{
      success: boolean;
      pricing: { monthly: SubscriptionTier; yearly: SubscriptionTier };
    }>('/api/subscription/pricing'),

  /** Returns the status flat on the response body, not nested. */
  getStatus: (token: string) =>
    api.get<{ success: boolean } & SubscriptionStatus>('/api/subscription/status', token),

  /** Report a confirmed on-chain payment. The backend verifies it. */
  subscribe: (
    subscriptionType: 'monthly' | 'yearly',
    txSignature: string,
    token: string
  ) =>
    api.post<{ success: boolean; message?: string; subscription?: SubscriptionStatus }>(
      '/api/subscription/subscribe',
      { subscriptionType, txSignature },
      token
    ),

  cancel: (token: string) =>
    api.post<{ success: boolean; message?: string }>(
      '/api/subscription/cancel',
      {},
      token
    ),
};
