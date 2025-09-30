# Korus Reputation Score System (Backend Service)

## Overview
The Korus Reputation Score (KRS) is a backend-only scoring system that silently tracks user contributions and engagement on the platform. This score is calculated and stored internally for:
- Fair ranking of users
- Determining future airdrop allocations
- Qualifying users for special features
- Community governance weight

**Note**: This is a backend calculation system only. There are no UI components or user-facing pages for reputation scores.

## Score Components

### 1. Content Creation (40% weight)
- **Quality Posts**: +10-50 points (based on engagement)
- **Daily Posting Streak**: +5 points/day (max 30 days)
- **Media Posts**: +5 bonus points (images/videos)
- **Original Content**: +20 points (verified unique)

### 2. Engagement (30% weight)
- **Likes Given**: +1 point each (max 10/day)
- **Likes Received**: +2 points each
- **Comments Made**: +3 points each
- **Comments Received**: +5 points each
- **Tips Given**: +10 points per 100 $ALLY
- **Tips Received**: +15 points per 100 $ALLY

### 3. Community Building (20% weight)
- **New User Referrals**: +100 points each
- **Helping New Users**: +20 points (first interaction)
- **Verified Followers**: +5 points per follower
- **Community Events**: +50 points per participation

### 4. Platform Loyalty (10% weight)
- **Account Age**: +10 points per month
- **Daily Active**: +2 points per day
- **Premium Status**: 2x multiplier on all points
- **Genesis Token Holder**: 3x multiplier on all points

## Reputation Tiers

### 🌱 Seedling (0-999 KRS)
- New users
- Basic features
- 1x airdrop multiplier

### 🌿 Sprout (1,000-4,999 KRS)
- Active users
- Profile badges
- 1.5x airdrop multiplier

### 🌳 Tree (5,000-19,999 KRS)
- Regular contributors
- Custom themes
- 2x airdrop multiplier

### 🌲 Forest (20,000-49,999 KRS)
- Power users
- Early feature access
- 3x airdrop multiplier

### 🏔️ Mountain (50,000-99,999 KRS)
- Community leaders
- Governance voting rights
- 5x airdrop multiplier

### 🌟 Celestial (100,000+ KRS)
- Platform ambassadors
- Direct team access
- 10x airdrop multiplier

## Anti-Gaming Measures

1. **Diminishing Returns**: Repeated actions have decreasing value
2. **Quality Filters**: Low-quality content receives minimal points
3. **Time Delays**: Actions must be spaced out to count
4. **Engagement Ratios**: Balanced activity required
5. **Sybil Protection**: One account per wallet enforced

## Airdrop Calculation

```
Airdrop Share = (User KRS / Total Platform KRS) × Airdrop Pool × Tier Multiplier
```

## Special Achievements

### 🏆 Badges
- **Early Adopter**: Join in first month (+1000 KRS)
- **Content King**: 100 quality posts (+500 KRS)
- **Social Butterfly**: 1000 interactions (+500 KRS)
- **Diamond Hands**: Hold 10k $ALLY (+1000 KRS)
- **Game Master**: Win 50 games (+750 KRS)

## Implementation Notes

1. Scores update in real-time in the background
2. Weekly snapshots for airdrop calculations
3. Monthly internal leaderboard calculations
4. Historical data preserved for future use
5. All calculations happen server-side (or in services/reputation.ts for offline mode)

## Technical Details

- Service: `services/reputation.ts`
- Storage: AsyncStorage (offline mode) / Database (online mode)
- Tracks all user actions automatically
- No user-facing UI components
- Scores used internally for fair distribution of rewards