import type { MetadataRoute } from 'next';

const SITE_URL = 'https://korus.fun';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Revalidate hourly so newly created posts get picked up without a redeploy.
export const revalidate = 3600;

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: SITE_URL, changeFrequency: 'hourly', priority: 1 },
  { url: `${SITE_URL}/events`, changeFrequency: 'daily', priority: 0.8 },
  { url: `${SITE_URL}/games`, changeFrequency: 'daily', priority: 0.8 },
  { url: `${SITE_URL}/welcome`, changeFrequency: 'monthly', priority: 0.5 },
];

// The API caps `limit` at 100, so walk cursor pages up to a sane ceiling.
const PAGE_SIZE = 100;
const MAX_PAGES = 5;

type SitemapPost = { id: string; updatedAt?: string; createdAt?: string };

async function fetchPosts(): Promise<SitemapPost[]> {
  const collected: SitemapPost[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`${API_BASE_URL}/api/posts`);
    url.searchParams.set('limit', String(PAGE_SIZE));
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) break;

    const data = await res.json();
    if (!data?.success) break;

    const posts: SitemapPost[] = data.posts ?? [];
    collected.push(...posts);

    const next = data.meta?.nextCursor;
    if (!data.meta?.hasMore || !next || posts.length === 0) break;
    cursor = next;
  }

  return collected;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const posts = await fetchPosts();

    return [
      ...STATIC_ROUTES,
      ...posts.map((post) => ({
        url: `${SITE_URL}/post/${post.id}`,
        lastModified: new Date(post.updatedAt || post.createdAt || Date.now()),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
    ];
  } catch {
    // Never let a backend hiccup fail the build — static routes still get indexed.
    return STATIC_ROUTES;
  }
}
