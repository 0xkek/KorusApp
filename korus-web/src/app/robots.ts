import type { MetadataRoute } from 'next';

const SITE_URL = 'https://korus.fun';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Authenticated / per-user surfaces carry no crawlable value.
        disallow: ['/api/', '/admin', '/settings', '/edit-profile', '/wallet'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
