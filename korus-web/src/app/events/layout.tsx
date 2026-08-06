import type { Metadata } from 'next';

// Route metadata. The root layout is a client component and cannot export
// `metadata`, so each client route gets a thin server layout for its title.
export const metadata: Metadata = {
  title: 'Events — Korus',
  description: 'Discover whitelists, airdrops, mints and beta access from Solana projects.',
  openGraph: { title: 'Events — Korus', description: 'Discover whitelists, airdrops, mints and beta access from Solana projects.', siteName: 'Korus.fun', type: 'website' },
};

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
