import type { Metadata } from 'next';

// Server layout wrapping the feed at "/". The root layout is a client
// component and so cannot export `metadata`; a hardcoded <title> there
// produced a duplicate on routes that define their own (e.g. /post/[id],
// whose title carries the post text for link previews). The route group
// "(home)" does not affect the URL — this page is still "/".
export const metadata: Metadata = {
  title: 'Korus.fun — Solana Social Platform',
  description:
    'The social platform built on Solana. Connect your wallet, share posts, play games with SOL wagers, earn reputation, and join exclusive events.',
  openGraph: {
    title: 'Korus.fun — Solana Social Platform',
    description:
      'Connect, play, and earn on Solana. Games with SOL wagers, reputation system, premium features, and community events.',
    siteName: 'Korus.fun',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Korus.fun — Solana Social Platform',
    description: 'Connect, play, and earn on Solana.',
  },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
