# Korus Token Strategy & Migration Plan

## Overview
Since SKR (Seeker Token) is not yet launched, Korus has three strategic options for token implementation, with a recommendation for the optimal path forward.

## Strategic Options

### Option A: Wait for SKR Launch (Recommended)
**Pros:**
- Strong ecosystem alignment with Seeker
- Shared token economics benefit both platforms
- Genesis NFT holders get unified rewards
- No need to bootstrap separate liquidity

**Cons:**
- Launch timing dependent on Seeker
- Less control over token features

### Option B: Launch KORUS Token First
**Pros:**
- Immediate launch capability
- Full control over tokenomics
- First-mover advantage in social+gaming

**Cons:**
- Need to bootstrap liquidity alone
- Potential future friction with SKR ecosystem

### Option C: Use SOL Temporarily
**Pros:**
- Launch immediately with established token
- No regulatory concerns
- High liquidity

**Cons:**
- No value capture for platform growth
- Difficult to transition users later
- Less engaging for community

## Recommended Strategy: Coordinated Launch with SKR

### Phase 1: Pre-Launch Preparation (Now - SKR Launch)
**Timeline: Current → SKR Launch**

### Implementation
- **Token**: Prepare for SKR integration
- **Testing**: Use SOL on devnet for testing
- **Infrastructure**: Build distribution system
- **Community**: Build user base pre-token

### Development Tasks
1. Build reputation system ✓
2. Create distribution mechanism ✓
3. Implement sponsored posts system ✓
4. Prepare wallet infrastructure ✓

### Marketing Approach
- "Earn rewards when SKR launches"
- Build anticipation for token rewards
- Focus on platform utility first

### Phase 2: SKR Integration (SKR Launch → 6 months)
**Timeline: SKR Launch → 6 months post-launch**

### Implementation
- **Token**: SKR (Seeker Token)
- **Distribution**: Weekly reputation-based rewards
- **Revenue Split**: 50% users, 45% team, 5% operations

### Launch Week Actions
1. Update token mint address to SKR
2. Announce rewards program
3. First distribution Friday 8pm UTC
4. Marketing push with Seeker community

### Technical Configuration
```env
# Platform Configuration
SKR_TOKEN_MINT="[SKR Token Mint Address - TBD]"
PLATFORM_WALLET_ADDRESS="[Platform Wallet for SKR]"
TEAM_WALLET_ADDRESS="[Team Wallet for SKR]"
```

### Distribution Model
Every Friday at 8pm UTC:
1. Scan platform wallet for SKR revenue
2. Distribute 50% to users based on weekly reputation
3. Send 45% to team wallet
4. Keep 5% for transaction fees

## Phase 3: Potential KORUS Token Development (Year 2+)
**Timeline: 12+ months after SKR integration**

### Token Design
- **Name**: KORUS
- **Symbol**: KRS
- **Supply**: 1 billion tokens
- **Decimals**: 6
- **Network**: Solana SPL Token

### Tokenomics
```
Total Supply: 1,000,000,000 KRS

Distribution:
- 30% - Community Rewards Pool
- 20% - Team & Advisors (2-year vesting)
- 15% - SKR Holder Airdrop
- 15% - Liquidity Pools
- 10% - Treasury
- 5%  - Marketing & Partnerships
- 5%  - Early User Rewards
```

### Smart Contract Features
- Reputation-based distribution mechanism
- Team vesting contracts
- Governance capabilities (future DAO)
- Burn mechanism for deflationary pressure

### Decision Factors for KORUS Token
Only consider KORUS token if:
1. SKR doesn't align with Korus platform needs
2. Community strongly requests separate token
3. Regulatory requirements necessitate it
4. Strategic partnership opportunities require it

### If Proceeding with KORUS:
- Maintain strong SKR integration
- Offer generous SKR→KRS conversion
- Consider dual-token rewards
- Ensure seamless user experience


## Technical Implementation Checklist

### Pre-SKR Launch (Current Priority)
- [ ] Keep "ALLY" as placeholder in code
- [ ] Build reputation tracking system ✓
- [ ] Implement distribution mechanism ✓
- [ ] Create sponsored post system ✓
- [ ] Test with SOL on devnet
- [ ] Prepare marketing materials
- [ ] Build community pre-token

### SKR Launch Week
- [ ] Update token mint address to SKR
- [ ] Configure platform wallets
- [ ] Test distribution on mainnet
- [ ] Announce to community
- [ ] First distribution Friday

### Post-Launch Optimization
- [ ] Monitor distribution metrics
- [ ] Gather community feedback
- [ ] Optimize reward algorithms
- [ ] Scale infrastructure

## Immediate Action Plan

### This Week
1. **Keep Building** - Platform functionality first
2. **Community Growth** - Users before tokens
3. **Seeker Alignment** - Coordinate SKR launch timing

### Pre-SKR Launch Messaging
- "Build your reputation now, earn rewards when SKR launches"
- "Early users get bonus multipliers"
- "Your activity today = your earnings tomorrow"

### Platform Readiness Checklist
- [x] Reputation system built
- [x] Distribution mechanism ready
- [x] Revenue model implemented
- [ ] Community size target (1000+ active users)
- [ ] Sponsored post pipeline
- [ ] Game activity metrics

## Coordination with Seeker

### Discussion Points
1. SKR launch timeline
2. Token allocation for Korus rewards
3. Cross-platform promotions
4. Genesis NFT holder benefits
5. Shared infrastructure needs

### Mutual Benefits
- Korus drives SKR utility
- Seeker provides initial liquidity
- Shared user base growth
- Ecosystem network effects

---

## Quick Reference

### Current Status
```bash
Token: ALLY (placeholder)
Status: Awaiting SKR launch
Testing: Use SOL on devnet
Infrastructure: Ready for token swap
```

### Upon SKR Launch
```bash
Token: SKR (Seeker Token)
Distribution: Weekly, Fridays 8pm UTC
Split: 50% users, 45% team, 5% ops
Integration: Update mint address only
```

### Future Consideration
```bash
Token: KORUS (if needed)
Decision: Based on platform needs
Timeline: Year 2+ 
Approach: Complement, not replace SKR
```

---

## Key Decisions Made

1. **Wait for SKR** - Don't launch separate token first
2. **Build Community** - Focus on users over tokenomics
3. **Align with Seeker** - Stronger together
4. **Keep Options Open** - KORUS possible in future if needed

---

*This document should be updated when SKR launch date is confirmed.*