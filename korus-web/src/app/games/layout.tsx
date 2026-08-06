import type { Metadata } from 'next';

// Route metadata. The root layout is a client component and cannot export
// `metadata`, so each client route gets a thin server layout for its title.
export const metadata: Metadata = {
  title: 'Games — Korus',
  description: 'Play Tic-Tac-Toe, Rock Paper Scissors and Connect Four with SOL wagers and on-chain escrow.',
  openGraph: { title: 'Games — Korus', description: 'Play Tic-Tac-Toe, Rock Paper Scissors and Connect Four with SOL wagers and on-chain escrow.', siteName: 'Korus.fun', type: 'website' },
};

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
