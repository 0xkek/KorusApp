'use client';

/**
 * Warns when the app is pointed at a non-mainnet cluster.
 *
 * Renders nothing on mainnet — production is correctly configured today, and a
 * permanent "you're on mainnet" badge is noise. The point is that if the network
 * env var is ever missing or changed, users see it immediately rather than
 * sending what they believe is real SOL on devnet. The adapter falls back to
 * devnet when NEXT_PUBLIC_SOLANA_NETWORK is unset, so silence is not safe by
 * default.
 */
export default function NetworkBanner() {
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK;

  if (network === 'mainnet-beta') return null;

  const label = network ? network : 'an unknown network (defaulting to devnet)';

  return (
    <div
      className="w-full px-4 py-2 text-center text-[13px] font-semibold"
      style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#facc15' }}
      role="status"
    >
      ⚠️ Test network — you are connected to {label}. Tokens here are not real.
    </div>
  );
}
