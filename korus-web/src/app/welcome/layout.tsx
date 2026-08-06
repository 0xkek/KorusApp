import type { Metadata } from 'next';

// Route metadata. The root layout is a client component and cannot export
// `metadata`, so each client route gets a thin server layout for its title.
export const metadata: Metadata = {
  title: 'Welcome to Korus',
  description: 'Connect a Solana wallet to join Korus — no bots, no fake accounts, just real people.',
  openGraph: { title: 'Welcome to Korus', description: 'Connect a Solana wallet to join Korus — no bots, no fake accounts, just real people.', siteName: 'Korus.fun', type: 'website' },
};

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
