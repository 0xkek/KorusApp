import type { Metadata } from 'next';

const SITE_URL = 'https://korus.fun';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

function displayName(author: {
  username?: string | null;
  snsUsername?: string | null;
  walletAddress?: string | null;
}): string {
  // '__wallet__' is the backend sentinel meaning "show the wallet address".
  const sns = author.snsUsername === '__wallet__' ? null : author.snsUsername;
  const name = author.username === '__wallet__' ? null : author.username;
  if (name) return `@${name}`;
  if (sns) return sns;
  const w = author.walletAddress ?? '';
  return w ? `${w.slice(0, 4)}...${w.slice(-4)}` : 'Someone';
}

// Per-post metadata so shared links show the actual post rather than the
// generic site card. Falls back to site defaults if the post can't be loaded.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const fallback: Metadata = {
    title: 'Korus.fun — Solana Social Platform',
    description: 'The social platform built on Solana.',
  };

  try {
    const { id } = await params;
    const res = await fetch(`${API_BASE_URL}/api/posts/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return fallback;

    const data = await res.json();
    const post = data?.post ?? data?.posts?.[0];
    if (!post) return fallback;

    const author = displayName(post.author ?? {});
    const raw = (post.content ?? '').trim();
    const snippet = raw.length > 160 ? `${raw.slice(0, 157)}...` : raw;
    const title = raw ? `${author}: ${snippet.slice(0, 60)}` : `Post by ${author}`;
    const description = snippet || `See what ${author} is posting on Korus.`;
    const url = `${SITE_URL}/post/${id}`;

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        type: 'article',
        siteName: 'Korus.fun',
        ...(post.imageUrl ? { images: [{ url: post.imageUrl }] } : {}),
      },
      twitter: {
        card: post.imageUrl ? 'summary_large_image' : 'summary',
        title,
        description,
        ...(post.imageUrl ? { images: [post.imageUrl] } : {}),
      },
    };
  } catch {
    return fallback;
  }
}

export default function PostLayout({ children }: Props) {
  return children;
}
