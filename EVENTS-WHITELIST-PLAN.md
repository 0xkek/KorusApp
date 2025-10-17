# Korus Events - Whitelist Tracker System

## 🎯 Core Concept

A whitelist tracking platform where projects can collect verified wallet addresses from interested users through wallet signatures. **No money handling, no custody, no financial liability** - just authenticated data collection.

## 📋 Value Proposition

### For Projects
- ✅ Verified wallet addresses (cryptographically signed)
- ✅ Sybil-resistant (one wallet = one spot)
- ✅ Quality signals (Korus reputation scores included)
- ✅ Easy export (CSV/JSON download)
- ✅ Engagement metrics and analytics
- ✅ Anti-bot measures built-in

### For Users
- ✅ Simple process (just sign a message - no gas fees!)
- ✅ Track position in queue (#234 / 500)
- ✅ Dashboard of all whitelists joined
- ✅ Notifications when whitelists open/close
- ✅ No money at risk, just signature

### For Korus Platform
- ✅ **Zero financial liability** (just data collection)
- ✅ Drives platform engagement
- ✅ Natural premium feature opportunity
- ✅ Positions Korus as "Premint.xyz for Solana"
- ✅ Builds reputation in Solana ecosystem

---

## 🏗️ System Architecture

### Event Types
1. **NFT Mint Whitelist** - Early access to NFT mints
2. **Token Launch Whitelist** - Priority access to token sales
3. **Airdrop Registration** - Sign up for airdrops
4. **Community Events** - Meetups, AMAs, etc.
5. **Beta Access** - Early product testing

### Database Schema

```typescript
// Event Model
Event {
  id: string (cuid)
  type: 'whitelist' | 'airdrop' | 'mint' | 'beta'
  projectName: string
  title: string
  description: string
  imageUrl?: string
  externalLink: string  // Project website/Discord

  // Whitelist Configuration
  maxSpots?: number  // null = unlimited
  startDate: Date
  endDate: Date
  selectionMethod: 'fcfs' | 'lottery' | 'weighted_lottery'

  // Requirements
  requirements: string[]  // ["Hold 1+ SOL", "Active Korus user"]
  minReputation?: number
  minAccountAge?: number  // days

  // Creator Info
  creatorWallet: string
  verified: boolean  // Verified by Korus team
  featured: boolean  // Paid promotion

  // Stats
  registrationCount: number
  viewCount: number

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

// Whitelist Registration Model
WhitelistRegistration {
  id: string (cuid)
  eventId: string  // FK to Event
  walletAddress: string

  // Proof of ownership
  signature: string  // Wallet signature
  signedMessage: string  // Message that was signed

  // User info at time of registration
  reputationScore: number
  accountAge: number  // days

  // Status
  status: 'registered' | 'waitlist' | 'selected' | 'rejected'
  position?: number  // Queue position
  selectedAt?: Date  // If selected via lottery

  // Optional metadata
  metadata: {
    twitter?: string
    discord?: string
    email?: string
  }

  // Timestamps
  registeredAt: Date

  // Relations
  event: Event
  user: User

  // Unique constraint: one wallet per event
  @@unique([eventId, walletAddress])
}
```

---

## 🔐 Security & Anti-Sybil

### Signature Verification Process

1. **Generate Message:**
   ```
   I want to join the [Project Name] whitelist.
   Event ID: [event_id]
   Timestamp: [unix_timestamp]
   Nonce: [random_string]
   ```

2. **User Signs:** Wallet extension signs the message (no gas)

3. **Backend Verifies:**
   - Signature is valid
   - Wallet matches signature
   - Timestamp is recent (< 5 min old)
   - Wallet hasn't already registered

4. **Store Registration:** Save to database with signature proof

### Anti-Sybil Measures

Projects can configure:
- **Minimum Reputation:** Require X Korus reputation points
- **Account Age:** Account must be X days old
- **Activity Requirements:** Posted X times, liked X posts
- **Token Holdings:** Must hold X SOL or specific NFT
- **One Registration Per Wallet:** Enforced at database level

---

## 🎨 User Flow

### Joining a Whitelist

1. **User browses Events page**
   - Sees upcoming whitelists
   - Filters by type, date, spots available

2. **Clicks "Join Whitelist"**
   - Modal shows event details
   - Requirements list
   - Current position: "234 / 500 spots filled"

3. **Reviews requirements**
   - ✅ Connected wallet
   - ✅ 100+ Korus reputation
   - ✅ Hold 1+ SOL
   - ❌ Account age: 5 days (need 7)

4. **Signs message**
   - Wallet popup appears
   - Signs message (no gas fee!)
   - Confirmation: "✅ You're #235 on the whitelist!"

5. **Receives confirmation**
   - Added to dashboard
   - Gets notification when whitelist closes
   - Can share achievement to feed

### Project Dashboard

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CyberPunks Genesis Whitelist
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: Active
Registered: 487 / 500 spots (97.4%)
Closes in: 2 days, 5 hours

[Download CSV] [Download JSON] [View Analytics] [Close Early]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Analytics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Avg Reputation: 1,247
Median SOL Holdings: 3.5 SOL
Top 10% Rep Range: 2,000+

Distribution by Rep Score:
2000+: ████████░░ 45 (9%)
1500+: ██████████ 120 (25%)
1000+: ████████░░ 180 (37%)
500+:  ██████░░░░ 120 (25%)
<500:  ██░░░░░░░░ 22 (4%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Export Preview
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Position | Wallet Address          | Rep   | Registered
1        | 7xK2w...abc123         | 2,400 | Oct 16, 14:30
2        | 3mN8p...xyz789         | 1,850 | Oct 16, 14:32
3        | 5qR9j...def456         | 1,720 | Oct 16, 14:35
...
```

---

## 📊 Selection Methods

### 1. First-Come-First-Serve (FCFS)
- First X users to register get the spots
- Simple and transparent
- Favors fast users

### 2. Lottery (Random)
- All qualified users entered
- Random selection at close date
- Fair for everyone

### 3. Weighted Lottery
- Higher reputation = more entries
- Example: 1000 rep = 10 entries, 2000 rep = 20 entries
- Rewards platform engagement

---

## 💎 Premium Features

### Free Users
- Join whitelists
- See position in queue
- Basic notifications
- Export own data

### Premium Users ($5/month)
- 🌟 **12-hour early access** to whitelists
- 🌟 **Priority badge** (visible to projects)
- 🌟 **Advanced analytics** dashboard
- 🌟 **Automatic lottery entries** (more chances)
- 🌟 **Unlimited whitelist tracking**

---

## 📥 Export Formats

### CSV Export
```csv
Position,Wallet_Address,Reputation_Score,Registered_At,Twitter,Discord
1,7xK2w...abc123,2400,2025-10-16 14:30,@user123,user#1234
2,3mN8p...xyz789,1850,2025-10-16 14:32,@user456,user#5678
3,5qR9j...def456,1720,2025-10-16 14:35,@user789,user#9012
```

### JSON Export
```json
{
  "event": {
    "id": "evt_123",
    "title": "CyberPunks Genesis Whitelist",
    "exportedAt": "2025-10-18T10:00:00Z",
    "totalRegistrations": 487
  },
  "registrations": [
    {
      "position": 1,
      "walletAddress": "7xK2w...abc123",
      "reputationScore": 2400,
      "registeredAt": "2025-10-16T14:30:00Z",
      "accountAge": 45,
      "metadata": {
        "twitter": "@user123",
        "discord": "user#1234"
      }
    }
  ]
}
```

---

## 🚀 Implementation Phases

### Phase 1: MVP (Week 1-2)
- [x] Database schema (Event, WhitelistRegistration models)
- [ ] Backend API endpoints
  - POST /api/events - Create event
  - GET /api/events - List events
  - GET /api/events/:id - Get event details
  - POST /api/events/:id/register - Join whitelist
  - GET /api/events/:id/registrations - View registrations (project owner only)
  - GET /api/events/:id/export - Download CSV/JSON
- [ ] Signature verification service
- [ ] Frontend: Events listing page
- [ ] Frontend: Event detail modal
- [ ] Frontend: Join whitelist flow

### Phase 2: Enhanced (Week 3-4)
- [ ] Project dashboard
- [ ] Analytics and metrics
- [ ] Premium early access (12-hour headstart)
- [ ] Lottery selection system
- [ ] Waitlist functionality
- [ ] Email/push notifications

### Phase 3: Advanced (Week 5+)
- [ ] Verification badges for projects
- [ ] Community voting on projects
- [ ] Anti-bot measures (CAPTCHA, rate limiting)
- [ ] Discord/Twitter integration
- [ ] Reputation-based requirements
- [ ] Featured/promoted whitelists
- [ ] Mobile app support

---

## 📈 Success Metrics

### User Engagement
- Number of whitelists joined per user
- Average time to fill whitelist
- Return rate (users joining multiple whitelists)

### Project Success
- Number of projects posting whitelists
- Average registration rate
- Project satisfaction (survey)

### Platform Growth
- Premium conversion rate from whitelist users
- Organic growth from projects promoting Korus
- Retention (% of users active after 30 days)

---

## 💰 Monetization Strategy

### For Platform
1. **Premium Subscriptions:** Early access + priority badge
2. **Project Fees:** 0.1 SOL to post whitelist (prevents spam)
3. **Featured Placement:** Projects pay to be highlighted
4. **Verification Service:** Pay for "Verified by Korus" badge

### Revenue Model
- Free whitelists = Community engagement
- Paid features = Revenue
- Win-win: Help projects + earn sustainably

---

## ⚠️ Important Considerations

### Legal
- **No investment advice:** Disclaimer on every event
- **No endorsements:** We don't recommend any project
- **User responsibility:** Users DYOR before joining
- **No custody:** We never hold user funds

### Security
- **Signature verification:** Prevent fake registrations
- **Rate limiting:** Prevent spam/bot attacks
- **Data privacy:** GDPR compliance (user can delete data)
- **Backup exports:** Projects can download anytime

### Community
- **Report system:** Flag suspicious projects
- **Verification process:** Manual review for verified badge
- **Clear guidelines:** What can/can't be posted
- **Support system:** Help projects and users

---

## 🎯 Competitive Advantage

### vs Premint.xyz
- ✅ Integrated social platform (share, discuss)
- ✅ Reputation system (quality signal for projects)
- ✅ Solana-native (better UX for Solana projects)

### vs Discord/Twitter
- ✅ Verified signatures (no fake interest)
- ✅ Easy export (CSV/JSON)
- ✅ Analytics dashboard
- ✅ Anti-Sybil measures built-in

---

## 📝 Next Steps

1. **Finalize database schema** - Review and approve
2. **Build backend API** - Events controller + routes
3. **Implement signature verification** - Security critical
4. **Design UI mockups** - Events page + modals
5. **Build frontend** - React components
6. **Testing** - End-to-end flow
7. **Beta launch** - Test with 1-2 projects
8. **Public launch** - Marketing push

---

## 📞 Project Contact

- **Lead Developer:** Claude
- **Product Owner:** Max
- **Timeline:** 4-6 weeks to full MVP
- **Status:** Planning phase complete ✅

---

*Last updated: October 16, 2025*
