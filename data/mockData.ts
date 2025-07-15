import { Post } from '../types';

export const subtopicData: { [key: string]: string[] } = {
  career: ['Job Search', 'Interviews', 'Networking', 'Salary Negotiation', 'Leadership', 'Career Change'],
  health: ['Mental Health', 'Fitness', 'Nutrition', 'Sleep', 'Addiction', 'Medical'],
  relationships: ['Dating', 'Marriage', 'Parenting', 'Family', 'Friendship', 'Breakups'],
  finance: ['Investing', 'Budgeting', 'Debt', 'Real Estate', 'Retirement', 'Side Hustle'],
  growth: ['Goals', 'Productivity', 'Learning', 'Habits', 'Confidence', 'Purpose']
};

export const initialPosts: Post[] = [
  {
    id: 1,
    wallet: '7xK9...mP4q',
    time: '2h ago',
    content: "Been struggling with imposter syndrome at my new job. Senior dev role but I feel like I'm drowning. How do you push through that voice saying you don't belong? 🚀",
    likes: 23,
    replies: [
      {
        id: 101,
        wallet: 'zR8f...kL3m',
        time: '1h ago',
        content: "I felt the same way! What helped me was remembering that they hired you for a reason. You earned that position. ✨",
        likes: 8,
        liked: false,
        tips: 2,
        bumped: false,
        bumpedAt: undefined,
        bumpExpiresAt: undefined,
        replies: [
          {
            id: 1001,
            wallet: 'mH5t...rK8j',
            time: '30m ago',
            content: "This is so true. Also, everyone feels like they don't know what they're doing sometimes, even seniors. 💎",
            likes: 3,
            liked: false,
            tips: 0,
            bumped: false,
            bumpedAt: undefined,
            bumpExpiresAt: undefined,
            replies: []
          }
        ]
      },
      {
        id: 102,
        wallet: 'nQ7p...vX9w',
        time: '45m ago',
        content: "Try the '5-minute rule' - when you feel overwhelmed, just focus on the next 5 minutes. It really helps break the anxiety cycle. 🌿",
        likes: 12,
        liked: true,
        tips: 0,
        bumped: false,
        bumpedAt: undefined,
        bumpExpiresAt: undefined,
        replies: []
      }
    ],
    tips: 12,
    liked: false,
    bumped: false,
    bumpedAt: undefined,
    bumpExpiresAt: undefined,
    category: 'CAREER',
    subcategory: 'Leadership'
  },
  {
    id: 2,
    wallet: '9nF2...vR8s',
    time: '4h ago',
    content: "Update: Took everyone's advice and had the conversation with my manager about workload. Set better boundaries. Thanks for the push, community! 🙏",
    likes: 47,
    replies: [
      {
        id: 201,
        wallet: 'mH5t...rK8j',
        time: '3h ago',
        content: "Proud of you for speaking up! That takes real courage. 🔥",
        likes: 15,
        liked: false,
        tips: 1,
        bumped: false,
        bumpedAt: undefined,
        bumpExpiresAt: undefined,
        replies: []
      }
    ],
    tips: 0,
    liked: true,
    bumped: false,
    bumpedAt: undefined,
    bumpExpiresAt: undefined,
    category: 'CAREER',
    subcategory: 'Leadership'
  },
  {
    id: 3,
    wallet: '3mT8...dH7k',
    time: '6h ago',
    content: "Thinking about making a career pivot from finance to tech. 32 years old, no CS background. Is it too late to start? Looking for honest perspectives. 💭",
    likes: 31,
    replies: [],
    tips: 0,
    liked: false,
    bumped: false,
    bumpedAt: undefined,
    bumpExpiresAt: undefined,
    category: 'CAREER',
    subcategory: 'Career Change'
  },
  {
    id: 4,
    wallet: '5pL6...qX9j',
    time: '8h ago',
    content: "Pro tip: Before every difficult conversation, I write down 3 things I want to achieve. Keeps me focused and less emotional. Game changer for performance reviews. ⚡",
    likes: 64,
    replies: [],
    tips: 0,
    liked: false,
    bumped: false,
    bumpedAt: undefined,
    bumpExpiresAt: undefined,
    category: 'CAREER',
    subcategory: 'Leadership',
    sponsored: true
  },
  {
    id: 5,
    wallet: 'aB4c...9Fz2',
    time: '12h ago',
    content: "Anyone else feel like they're constantly comparing themselves to others on LinkedIn? That highlight reel is brutal for confidence. The mint-fresh perspective helps though! 🌟",
    likes: 89,
    replies: [],
    tips: 5,
    liked: false,
    bumped: false,
    bumpedAt: undefined,
    bumpExpiresAt: undefined,
    category: 'CAREER',
    subcategory: 'Networking'
  },
  {
    id: 6,
    wallet: 'cG7h...xN3p',
    time: '1d ago',
    content: "Just hit my first $10K in crypto gains this month! 📈 Started with DeFi staking and it's been incredible. The community support here is unmatched.",
    likes: 156,
    replies: [
      {
        id: 601,
        wallet: 'sT9w...mL4k',
        time: '18h ago',
        content: "Congrats! Which platforms are you using for staking? Always looking for new opportunities. 💰",
        likes: 23,
        liked: false,
        tips: 3,
        bumped: false,
        bumpedAt: undefined,
        bumpExpiresAt: undefined,
        replies: []
      }
    ],
    tips: 8,
    liked: false,
    bumped: false,
    bumpedAt: undefined,
    bumpExpiresAt: undefined,
    category: 'FINANCE',
    subcategory: 'Investing'
  },
  {
    id: 7,
    wallet: 'fR2k...pY8n',
    time: '1d ago',
    content: "NFT drop went live this morning and sold out in 12 minutes! 🎨 The utility features we built are game-changing. Thanks to everyone who believed in the vision.",
    likes: 234,
    replies: [],
    tips: 15,
    liked: false,
    bumped: false,
    bumpedAt: undefined,
    bumpExpiresAt: undefined,
    category: 'FINANCE',
    subcategory: 'Side Hustle'
  },
  {
    id: 8,
    wallet: 'jM4d...tZ7q',
    time: '2d ago',
    content: "Web3 development is the future, but the learning curve is steep. Anyone else making the transition from Web2? Share your resources! 🌐",
    likes: 78,
    replies: [
      {
        id: 801,
        wallet: 'nP6s...kR9m',
        time: '1d ago',
        content: "Solidity docs are your best friend. Also recommend Crypto Zombies for interactive learning. The mint-fresh approach to education! ⚡",
        likes: 34,
        liked: true,
        tips: 2,
        bumped: false,
        bumpedAt: undefined,
        bumpExpiresAt: undefined,
        replies: []
      }
    ],
    tips: 4,
    liked: false,
    bumped: false,
    bumpedAt: undefined,
    bumpExpiresAt: undefined,
    category: 'GROWTH',
    subcategory: 'Learning'
  }
];