# Deployment Guide

## 🚀 Automated Deployment Pipeline

### How It Works
1. **Code Push** → GitHub automatically triggers Railway deployment
2. **Build Process** → Railway runs `npm run build` 
3. **Auto-Migration** → Railway runs `npm run migrate:deploy` via `postinstall`
4. **Health Check** → Backend starts with updated schema

### Package.json Scripts
```json
{
  "postinstall": "prisma generate && npm run migrate:deploy",
  "migrate:deploy": "prisma migrate deploy",
  "migrate:dev": "prisma migrate dev"
}
```

## ✅ Pre-Deployment Checklist

### 1. Database Changes
- [ ] Run `prisma migrate dev --name "descriptive-name"` locally
- [ ] Test migration on development database
- [ ] Verify schema.prisma matches intended changes
- [ ] Check for breaking changes in existing queries

### 2. Code Quality
- [ ] TypeScript compilation passes (`npm run build`)
- [ ] Prisma client generates without errors (`prisma generate`)
- [ ] All new endpoints tested locally
- [ ] Environment variables configured

### 3. Migration Safety
- [ ] **Additive-only changes** (add columns, don't remove)
- [ ] **Backward compatible** during rollout period
- [ ] **Default values** for new required fields
- [ ] **Index creation** for performance

## 🔧 Manual Migration (Emergency)

If automated migration fails:

```bash
# Option 1: Force schema sync (destructive)
npx prisma db push

# Option 2: Deploy specific migration
npx prisma migrate deploy

# Option 3: Reset and reseed (development only)
npx prisma migrate reset
```

## 📊 Post-Deployment Verification

### Health Checks
- [ ] `/health` endpoint responds
- [ ] Authentication works
- [ ] Database queries succeed
- [ ] New endpoints return expected responses

### Performance Monitoring  
- [ ] Query execution times
- [ ] Memory usage stable
- [ ] No increase in error rates
- [ ] Index usage statistics

## 🚨 Rollback Plan

### If Migration Fails
1. **Immediate**: Rollback code deployment
2. **Database**: Run rollback migration if needed
3. **Monitoring**: Check error logs and metrics
4. **Communication**: Update team on status

### Prevention
- **Staging environment** mirrors production
- **Feature flags** for new database features
- **Gradual rollouts** for major changes
- **Database backups** before major migrations

## 🎯 Best Practices

### Migration Patterns
```sql
-- ✅ Good: Additive with defaults
ALTER TABLE users ADD COLUMN newField TEXT DEFAULT 'default_value';

-- ❌ Bad: Destructive without planning  
ALTER TABLE users DROP COLUMN oldField;

-- ✅ Good: Index creation
CREATE INDEX CONCURRENTLY idx_users_newfield ON users(newField);
```

### Deployment Timing
- **Off-peak hours** for major migrations
- **Maintenance windows** for breaking changes
- **Progressive rollouts** for user-facing features
- **Database backups** before deployment

## 📝 Troubleshooting

### Common Issues
1. **Schema mismatch** → Run migration immediately
2. **Connection errors** → Check DATABASE_URL
3. **Permission errors** → Verify Railway environment
4. **Timeout errors** → Optimize large migrations

### Debugging Commands
```bash
# Check migration status
npx prisma migrate status

# View current schema
npx prisma db pull

# Generate fresh client
npx prisma generate

# Push schema (development)
npx prisma db push
```

---

**Remember**: Every schema change should go through this process to ensure zero-downtime deployments and data integrity.