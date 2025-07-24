# 🚀 Korus Backend Implementation Plan

## Overview
This document outlines the comprehensive plan for implementing the backend functionality and connecting it to the Korus frontend application.

## Current State Assessment

### ✅ What's Already Built
- **Backend Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based auth with Solana wallet support (mocked)
- **API Structure**: RESTful endpoints for posts, replies, interactions
- **Database Schema**: Complete models for users, posts, replies, interactions

### ⚠️ What's Partially Implemented
- **Solana Integration**: Wallet signature verification (currently mocked)
- **Genesis Token Verification**: Placeholder implementation
- **Tip System**: Balance updates without blockchain transactions
- **Bump System**: Functional but needs testing with real data

### ❌ What's Missing
- **Frontend-Backend Connection**: No API integration in frontend
- **Real Authentication**: Mocked signature verification
- **Media Upload**: No image/video storage system
- **Notifications**: Schema exists but no implementation
- **Game Integration**: No backend support for games
- **Real Blockchain Transactions**: All on-chain operations are mocked

## Implementation Phases

### Phase 1: Connect Frontend to Backend (1-2 days)
**Goal**: Establish basic communication between frontend and backend

- [ ] Configure API base URL in frontend (`utils/api.ts`)
- [ ] Add axios instance with interceptors
- [ ] Implement JWT token storage and management
- [ ] Update `WalletContext` to use real authentication
- [ ] Test basic API connectivity
- [ ] Add error handling for network requests
- [ ] Update CORS settings for development

**Deliverables**:
- Working authentication flow
- Ability to fetch posts from backend
- JWT token persistence

### Phase 2: Real Solana Authentication (2-3 days)
**Goal**: Implement secure wallet-based authentication

- [ ] Add wallet signature request in frontend
- [ ] Implement proper message formatting
- [ ] Real signature verification in backend
- [ ] Genesis token ownership verification
- [ ] Secure nonce generation for replay protection
- [ ] Token refresh mechanism
- [ ] Logout functionality

**Deliverables**:
- Secure wallet authentication
- Genesis token premium tier assignment
- Session management

### Phase 3: Replace Mock Data with API Calls (3-4 days)
**Goal**: Full CRUD operations with real backend

- [ ] Replace `mockData.ts` with API calls
- [ ] Implement post creation with backend
- [ ] Real-time like/unlike functionality
- [ ] Reply system with threading
- [ ] Tip functionality (off-chain for now)
- [ ] Bump system integration
- [ ] User profile fetching
- [ ] Search functionality

**Deliverables**:
- Fully functional post/reply system
- Real-time interaction updates
- Working search and filters

### Phase 4: Media Upload & Storage (2-3 days)
**Goal**: Support for images and videos in posts

- [ ] Choose storage solution (S3, Cloudinary, etc.)
- [ ] Implement file upload endpoint
- [ ] Add image optimization/resizing
- [ ] Video upload with size limits
- [ ] Update post creation to include media
- [ ] CDN integration for fast delivery
- [ ] Clean up orphaned uploads

**Deliverables**:
- Image upload in posts
- Video support
- Optimized media delivery

### Phase 5: Notification System (2-3 days)
**Goal**: Real-time notifications for user interactions

- [ ] Implement notification creation in backend
- [ ] Add WebSocket support (Socket.io)
- [ ] Push notification setup (Expo Push)
- [ ] Notification preferences
- [ ] Mark as read functionality
- [ ] Notification grouping
- [ ] Badge count updates

**Deliverables**:
- Real-time notifications
- Push notifications
- Notification center

### Phase 6: Game System Backend (3-4 days)
**Goal**: Support for on-chain games with wagers

- [ ] Game state management in database
- [ ] WebSocket for real-time game moves
- [ ] Escrow system for wagers
- [ ] Game result verification
- [ ] Winner payout logic
- [ ] Game history tracking
- [ ] Anti-cheat measures

**Deliverables**:
- Functional game system
- Secure wager handling
- Real-time gameplay

### Phase 7: Blockchain Integration (3-4 days)
**Goal**: Real on-chain transactions for tips and games

- [ ] Solana program integration
- [ ] Transaction building for tips
- [ ] Escrow account creation for games
- [ ] Transaction status monitoring
- [ ] Balance synchronization
- [ ] Transaction history
- [ ] Error handling and retries

**Deliverables**:
- On-chain tipping
- Blockchain game wagers
- Transaction history

## Technical Requirements

### Environment Setup
```env
# Backend (.env)
DATABASE_URL=postgresql://user:password@localhost:5432/korus
JWT_SECRET=your-secret-key
SOLANA_RPC_URL=https://api.devnet.solana.com
GENESIS_TOKEN_MINT=your-token-mint
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=korus-media

# Frontend (.env.local)
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_WS_URL=ws://localhost:3000
```

### Dependencies to Add

**Backend**:
```json
{
  "socket.io": "^4.x",
  "multer": "^1.x",
  "sharp": "^0.x",
  "@aws-sdk/client-s3": "^3.x",
  "bull": "^4.x"
}
```

**Frontend**:
```json
{
  "axios": "^1.x",
  "socket.io-client": "^4.x",
  "react-query": "^3.x",
  "@solana/wallet-adapter-react": "^0.x"
}
```

## Database Migrations Needed

1. **Add media fields to Post model**:
   ```prisma
   model Post {
     // ... existing fields
     imageUrl      String?
     videoUrl      String?
     mediaType     String?
     thumbnailUrl  String?
   }
   ```

2. **Add Game model**:
   ```prisma
   model Game {
     id            String   @id @default(cuid())
     postId        String   @unique
     post          Post     @relation(fields: [postId], references: [id])
     gameType      String
     player1       String
     player2       String?
     wagerAmount   Decimal
     status        String
     gameState     Json
     winner        String?
     escrowAccount String?
     createdAt     DateTime @default(now())
     updatedAt     DateTime @updatedAt
   }
   ```

3. **Add notification fields**:
   ```prisma
   model Notification {
     // ... add actual implementation
     recipientWallet String
     type           String
     title          String
     body           String
     data           Json?
     read           Boolean @default(false)
     createdAt      DateTime @default(now())
   }
   ```

## Testing Strategy

### Unit Tests
- [ ] Auth service tests
- [ ] API endpoint tests
- [ ] Solana utility tests
- [ ] Database query tests

### Integration Tests
- [ ] Full auth flow test
- [ ] Post creation with media
- [ ] Game play scenarios
- [ ] Transaction flows

### E2E Tests
- [ ] User signup and posting
- [ ] Tipping flow
- [ ] Game completion
- [ ] Notification delivery

## Deployment Checklist

### Pre-deployment
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] SSL certificates configured
- [ ] CORS settings updated
- [ ] Rate limiting configured

### Deployment
- [ ] Backend deployed (Railway/Heroku/AWS)
- [ ] Database hosted (Supabase/Neon/AWS RDS)
- [ ] Media storage configured
- [ ] WebSocket server running
- [ ] Monitoring setup

### Post-deployment
- [ ] Smoke tests passed
- [ ] Performance monitoring active
- [ ] Error tracking enabled
- [ ] Backup system verified
- [ ] Documentation updated

## Risk Mitigation

### Security Considerations
- Input validation on all endpoints
- Rate limiting to prevent spam
- Secure file upload validation
- SQL injection prevention via Prisma
- XSS protection in user content

### Performance Optimization
- Database indexing strategy
- Caching layer (Redis)
- CDN for static assets
- Query optimization
- Connection pooling

### Scalability Planning
- Horizontal scaling ready
- Message queue for heavy tasks
- Microservice architecture consideration
- Load balancing setup
- Database sharding strategy

## Success Metrics

### Phase 1-3 Success
- [ ] Users can sign in with wallet
- [ ] Posts load from database
- [ ] Interactions work in real-time
- [ ] No critical errors in logs

### Phase 4-5 Success
- [ ] Media uploads work reliably
- [ ] Notifications deliver promptly
- [ ] User engagement increases
- [ ] Performance remains stable

### Phase 6-7 Success
- [ ] Games complete successfully
- [ ] Transactions confirm on-chain
- [ ] No funds lost in escrow
- [ ] Users trust the system

## Timeline Summary

**Total Estimated Time**: 16-24 days

- Week 1: Phases 1-2 (Basic connectivity & auth)
- Week 2: Phase 3 (Full API integration)
- Week 3: Phases 4-5 (Media & notifications)
- Week 4: Phases 6-7 (Games & blockchain)

## Next Steps

1. **Immediate Actions**:
   - Set up PostgreSQL database
   - Configure environment variables
   - Start backend server
   - Begin Phase 1 implementation

2. **Decisions Needed**:
   - Hosting platform choice
   - Storage solution selection
   - Solana network (Devnet/Mainnet)
   - Timeline priorities

3. **Resources Required**:
   - Database hosting
   - Storage service account
   - Solana RPC endpoint
   - Domain and SSL

---

**Note**: This plan is a living document and should be updated as development progresses. Each phase completion should be marked and any deviations from the plan should be documented.