# Content Moderation System

This document describes the comprehensive content moderation system implemented for the Korus social platform.

## 🛡️ System Overview

The moderation system provides multi-layered protection against harmful content and user behavior through:

1. **Automated content filtering** - Real-time scanning of posts/replies
2. **User reporting system** - Community-driven content flagging  
3. **Manual moderation tools** - Admin controls for content/user management
4. **Suspension & warning system** - Progressive user discipline
5. **Content hiding** - Removal of policy-violating content

## 🏗️ Architecture

### Database Models

#### User Moderation Fields
```sql
-- Added to existing User model
isSuspended           Boolean  @default(false)
suspensionReason      String?  @db.Text
suspendedUntil        DateTime?
warningCount          Int      @default(0)
```

#### Content Moderation Fields
```sql
-- Added to Post & Reply models
isHidden          Boolean  @default(false)
moderationReason  String?  @db.Text
flaggedCount      Int      @default(0)
```

#### ModerationAction Model
```sql
model ModerationAction {
  id              String   @id @default(cuid())
  moderatorWallet String   @db.VarChar(44)
  targetType      String   @db.VarChar(10) // "user", "post", "reply"
  targetId        String   // ID of target
  actionType      String   @db.VarChar(20) // "hide", "warn", "suspend", "unsuspend"
  reason          String   @db.Text
  duration        Int?     // Duration in hours for suspensions
  reportId        String?  // Related report
  createdAt       DateTime @default(now())
}
```

## 🔧 API Endpoints

### Moderation Actions

#### Hide Content
```
POST /api/moderation/hide
{
  "targetType": "post|reply",
  "targetId": "content_id",
  "reason": "Violation description",
  "reportId": "optional_report_id"
}
```

#### Suspend User
```
POST /api/moderation/suspend
{
  "targetWallet": "user_wallet_address",
  "reason": "Suspension reason",
  "duration": 24, // hours
  "reportId": "optional_report_id"
}
```

#### Warn User
```
POST /api/moderation/warn
{
  "targetWallet": "user_wallet_address", 
  "reason": "Warning reason",
  "reportId": "optional_report_id"
}
```

#### Unsuspend User
```
POST /api/moderation/unsuspend
{
  "targetWallet": "user_wallet_address",
  "reason": "Unsuspension reason"
}
```

### Dashboard & Analytics

#### Moderation Dashboard
```
GET /api/moderation/dashboard?timeframe=24h
Response: {
  "summary": {
    "pendingReports": 12,
    "hiddenPosts": 45,
    "hiddenReplies": 23,
    "suspendedUsers": 5
  },
  "recentActions": [...],
  "flaggedContent": {...}
}
```

#### Moderation History
```
GET /api/moderation/history/:targetType/:targetId
Response: [list of all moderation actions for target]
```

## 🤖 Automated Moderation

### Auto-Flagging Rules

#### Spam Detection
- **Repeated characters**: `(.)\1{10,}` (10+ same character)
- **Multiple URLs**: `(https?://[^\s]+){3,}` (3+ URLs)
- **Excessive caps**: `[A-Z]{20,}` (20+ consecutive capitals)

#### Inappropriate Content
- **Basic profanity**: Common offensive words
- **Security threats**: "scam", "phishing", "hack", "steal"

### Auto-Moderation Flow
1. Content created (post/reply)
2. `autoModerate()` function scans content
3. If flagged:
   - Increment `flaggedCount` 
   - Create system moderation action
   - Content remains visible but marked for review

## 🚨 Report Integration

### Report Processing
When reports are resolved through moderation:
1. Report status → "resolved"
2. `resolvedAt` timestamp set
3. `moderatorNotes` updated with action details
4. Related content actioned (hidden/warned/suspended)

### Report → Action Workflow
```
User Reports Content → Moderator Reviews → Takes Action → Report Resolved
```

## 🛑 User Suspension System

### Suspension Levels
- **Temporary**: 1 hour - 1 year duration
- **Automatic expiry**: System checks `suspendedUntil` timestamp
- **Manual unsuspend**: Moderator override capability

### Suspension Effects
- ❌ Cannot create posts
- ❌ Cannot create replies  
- ❌ Cannot like content
- ❌ Cannot tip users
- ✅ Can still browse content

### Warning System
- **Progressive discipline**: 1-5+ warnings tracked
- **Monitoring**: Users with 5+ warnings flagged for review
- **No automatic suspension**: Warnings inform moderation decisions

## 🔒 Content Filtering

### Hidden Content Behavior
- **Public feeds**: Hidden content excluded from `getPosts()`
- **Reply threads**: Hidden replies excluded from `getReplies()`
- **Search**: Hidden content not searchable
- **Direct access**: Returns 404 for hidden content

### Moderation Middleware
```typescript
// Applied to content creation endpoints
checkSuspension → checkWarnings → createContent
```

#### `checkSuspension`
- Blocks suspended users from creating content
- Auto-unsuspends expired suspensions
- Returns detailed suspension info

#### `checkWarnings`  
- Non-blocking warning header for high-warning users
- Enables proactive moderation monitoring

## 📊 Performance Optimization

### Moderation Indexes
```sql
-- User moderation queries
@@index([isSuspended, suspendedUntil])

-- Content moderation queries  
@@index([isHidden, createdAt(sort: Desc)])
@@index([flaggedCount(sort: Desc)])

-- Moderation action tracking
@@index([targetType, targetId])
@@index([moderatorWallet, createdAt(sort: Desc)])
@@index([actionType, createdAt(sort: Desc)])
```

**Expected Performance**:
- Moderation queries: 15-20x faster
- Content filtering: Built into main queries (no overhead)
- Dashboard loading: Sub-100ms response times

## 🔐 Security & Authorization

### Access Control
- **All endpoints**: Require JWT authentication
- **Admin actions**: Currently wallet-based (to be enhanced with role system)
- **Action logging**: Full audit trail of moderation decisions

### Rate Limiting
- **Moderation actions**: Inherit from global API rate limits
- **Bulk operations**: Not currently implemented (future enhancement)

## 🎯 Usage Examples

### Hide Spam Post
```bash
curl -X POST /api/moderation/hide \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetType": "post",
    "targetId": "clx123abc",
    "reason": "Spam content with repeated URLs",
    "reportId": "clx456def"
  }'
```

### Suspend Abusive User
```bash
curl -X POST /api/moderation/suspend \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetWallet": "B2x...",
    "reason": "Harassment in multiple replies",
    "duration": 168,
    "reportId": "clx789ghi"
  }'
```

### View Moderation Dashboard
```bash
curl -X GET /api/moderation/dashboard?timeframe=7d \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## 🚀 Future Enhancements

### Phase 2 Features
1. **Role-based permissions** - Admin/Moderator/User roles
2. **AI content scanning** - ML-powered inappropriate content detection
3. **Community moderation** - User voting on reports
4. **Appeal system** - Users can contest moderation actions
5. **Automated escalation** - High-flagged content auto-hidden
6. **Bulk operations** - Mass content management tools

### Phase 3 Features  
1. **Real-time alerts** - Push notifications for moderators
2. **Advanced analytics** - Trend analysis, user behavior patterns
3. **Integration APIs** - Third-party moderation service connectors
4. **Mobile moderation** - React Native moderation interface
5. **Audit compliance** - Legal/regulatory reporting tools

## 📈 Monitoring & Metrics

### Key Metrics to Track
- **Response time**: Average time from report to resolution
- **False positive rate**: Incorrectly flagged content percentage  
- **User satisfaction**: Appeal success rate
- **Content quality**: Reduction in policy violations
- **Moderator efficiency**: Actions per moderator per day

### Recommended Alerts
- **Pending reports > 50**: Moderation backlog
- **Flagged content spike**: Potential coordinated abuse
- **High warning users**: Proactive intervention needed
- **Suspension expiry**: Auto-unsuspend verification

---

*This moderation system provides enterprise-grade content management while maintaining user experience and community safety.*