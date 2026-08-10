/**
 * Shoutouts — paid promoted posts.
 *
 * A shoutout is a normal post created with shoutoutDuration plus a
 * transactionSignature for a SOL transfer to the treasury. The backend holds
 * the authoritative price table and rejects a payment that does not match, so
 * this table must stay in step with postsController's shoutoutPrices.
 *
 * Verified against korus-backend/src/controllers/postsController.ts.
 */

export interface ShoutoutOption {
  /** Minutes of promotion. */
  duration: number;
  priceSol: number;
  label: string;
}

export const SHOUTOUT_OPTIONS: ShoutoutOption[] = [
  { duration: 10, priceSol: 0.05, label: '10 minutes' },
  { duration: 20, priceSol: 0.1, label: '20 minutes' },
  { duration: 30, priceSol: 0.18, label: '30 minutes' },
  { duration: 60, priceSol: 0.35, label: '1 hour' },
  { duration: 120, priceSol: 0.7, label: '2 hours' },
  { duration: 180, priceSol: 1.3, label: '3 hours' },
  { duration: 240, priceSol: 2.0, label: '4 hours' },
];

export function shoutoutPrice(duration: number): number | null {
  return SHOUTOUT_OPTIONS.find((o) => o.duration === duration)?.priceSol ?? null;
}
