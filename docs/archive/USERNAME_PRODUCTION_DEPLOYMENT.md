# Username System - Production Deployment Guide

## Overview
The username system has been fully implemented with the following features:
- **Free users**: Can set username only once
- **Premium/VIP users**: Can change username anytime
- **Rate limiting**: 10 attempts per minute for username changes
- **Validation**: 3-20 characters, alphanumeric only
- **Disclaimer modal**: Warns free users about one-time setup

## Production Deployment Steps

### 1. Apply Database Changes

Run this command on your production database:

```bash
cd korus-backend
npx prisma db push --accept-data-loss
```

**OR** manually add the columns via SQL:

```sql
ALTER TABLE "users" ADD COLUMN "username" VARCHAR(20) UNIQUE;
ALTER TABLE "users" ADD COLUMN "hasSetUsername" BOOLEAN DEFAULT false;
```

### 2. Verify Database Changes

After applying changes, verify the columns exist:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('username', 'hasSetUsername');
```

### 3. Deploy Backend Code

The backend changes are already committed and include:
- `/api/user/username` - Set/update username endpoint
- `/api/user/check-username` - Check username availability
- `/api/user/profile` - Returns username and hasSetUsername fields
- Username validation utilities in `src/utils/usernameValidation.ts`
- Rate limiting configured in `src/middleware/rateLimiter.ts`

### 4. Deploy Frontend Code

The frontend changes in `app/profile.tsx` include:
- Fixed keyboard dismissal issue
- Username input field with validation
- Disclaimer modal for first-time setup
- Premium upgrade prompts
- Error handling with KorusAlert modals

## Testing Checklist

Before going live, test these scenarios:

- [ ] Free user can set username once
- [ ] Free user cannot change username after setting
- [ ] Premium user can change username multiple times
- [ ] Username validation works (3-20 chars, alphanumeric)
- [ ] Reserved usernames are blocked (admin, korus, etc.)
- [ ] Duplicate usernames are prevented
- [ ] Rate limiting prevents spam (10 attempts/minute)
- [ ] Disclaimer modal shows for free users
- [ ] Error messages display correctly
- [ ] Keyboard doesn't dismiss while typing

## Environment Variables

Ensure these are set in production:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - For authentication
- `NODE_ENV=production`

## Monitoring

After deployment, monitor:
- Database for username column data
- API logs for any username-related errors
- Rate limiting effectiveness
- User feedback on the feature

## Rollback Plan

If issues arise, you can disable the feature by:
1. Hiding the username field in the frontend (comment out the username section in `app/profile.tsx`)
2. The database columns can remain - they won't cause issues if unused

## Success Metrics

Track these after launch:
- % of users who set usernames
- % of premium upgrades from username feature
- Username change frequency for premium users
- Support tickets related to usernames

---

**Last Updated**: September 7, 2025
**Implemented By**: Claude Code
**Status**: ✅ Ready for Production