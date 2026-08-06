import type { Metadata } from 'next';

// Route metadata. The root layout is a client component and cannot export
// `metadata`, so each client route gets a thin server layout for its title.
export const metadata: Metadata = {
  title: 'Profile — Korus',
  description: 'Your Korus profile: posts, reputation, tips and game history.',
  openGraph: { title: 'Profile — Korus', description: 'Your Korus profile: posts, reputation, tips and game history.', siteName: 'Korus.fun', type: 'website' },
};

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
