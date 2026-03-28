/**
 * Fallback mock data used when backend returns empty results
 */

import type { Post } from '@/types';

export const MOCK_POSTS: Post[] = [
  {
    id: 1,
    user: 'shadowy',
    wallet: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    content: 'Just launched my new NFT collection on Solana! Check it out and let me know what you think.',
    likes: 247,
    replies: 18,
    tips: 12,
    time: '2h',
    isPremium: true,
  },
  {
    id: 2,
    user: 'defi_king',
    wallet: 'GKJRSuAqFatpGpNcB3dQkUDddt5p5uTwYdM2qygYzRBe',
    content: 'GM! The Solana ecosystem is absolutely thriving right now. What are you most excited about?',
    likes: 189,
    replies: 34,
    tips: 8,
    time: '4h',
    isPremium: false,
  },
  {
    id: 3,
    user: 'korus_official',
    wallet: 'BKJRSuAqF8tpGpNcB3dQkUDddt5p5uTwYdM2qygYzRBe',
    content: 'Welcome to Korus! Share your thoughts, support creators, and earn rewards.',
    likes: 892,
    replies: 145,
    tips: 67,
    time: '12h',
    isPremium: true,
  },
];
