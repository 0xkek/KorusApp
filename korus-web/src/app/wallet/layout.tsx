import type { Metadata } from 'next';

// Route metadata. The root layout is a client component and cannot export
// `metadata`, so each client route gets a thin server layout for its title.
export const metadata: Metadata = {
  title: 'Wallet — Korus',
  description: 'View your SOL balance, tips and on-chain activity on Korus.',
  openGraph: { title: 'Wallet — Korus', description: 'View your SOL balance, tips and on-chain activity on Korus.', siteName: 'Korus.fun', type: 'website' },
};

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
