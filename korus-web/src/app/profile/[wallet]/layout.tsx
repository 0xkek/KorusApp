import type { Metadata } from 'next';

const SITE_URL = 'https://korus.fun';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Props = {
  params: Promise<{ wallet: string }>;
  children: React.ReactNode;
};

// Per-profile metadata so a shared profile link shows who it is rather than a
// generic "Profile — Korus" card. Falls back to the generic title if the
// profile can't be loaded.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const fallback: Metadata = {
    title: 'Profile — Korus',
    description: 'A Korus profile on Solana.',
  };

  try {
    const { wallet } = await params;
    const res = await fetch(`${API_BASE_URL}/api/user/by-wallet/${wallet}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return fallback;

    const data = await res.json();
    const user = data?.user ?? data;
    if (!user?.walletAddress) return fallback;

    const short = `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
    // '__wallet__' is the backend sentinel meaning "show the wallet address".
    const name =
      user.username && user.username !== '__wallet__'
        ? `@${user.username}`
        : user.snsUsername && user.snsUsername !== '__wallet__'
          ? user.snsUsername
          : short;

    const title = `${name} on Korus`;
    const description =
      user.bio?.trim() ||
      `${name} — ${user.followerCount ?? 0} followers, ${user.reputationScore ?? 0} rep on Korus.`;
    const url = `${SITE_URL}/profile/${wallet}`;

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        type: 'profile',
        siteName: 'Korus.fun',
        ...(user.nftAvatar ? { images: [{ url: user.nftAvatar }] } : {}),
      },
      twitter: {
        card: 'summary',
        title,
        description,
        ...(user.nftAvatar ? { images: [user.nftAvatar] } : {}),
      },
    };
  } catch {
    return fallback;
  }
}

export default function ProfileLayout({ children }: Props) {
  return children;
}
