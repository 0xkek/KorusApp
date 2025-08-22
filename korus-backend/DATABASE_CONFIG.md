# Database Configuration for Production

## Connection Pooling

For production, add these parameters to your DATABASE_URL:

```
postgresql://user:password@host:5432/database?connection_limit=10&pool_timeout=30
```

### Recommended Settings:

- `connection_limit=10` - Maximum number of connections in the pool
- `pool_timeout=30` - Seconds to wait for a connection from the pool
- `connect_timeout=10` - Seconds to wait for initial connection
- `statement_timeout=30000` - Maximum time for a query (30 seconds)
- `idle_in_transaction_session_timeout=60000` - Kill idle transactions after 60 seconds

### Full Example:

```
DATABASE_URL="postgresql://username:password@localhost:5432/korusdb?connection_limit=10&pool_timeout=30&connect_timeout=10"
```

## Performance Optimizations

### 1. Connection Pool Sizing

- **Development**: 5 connections
- **Production**: 10-20 connections (depends on server resources)
- **Formula**: connections = ((core_count * 2) + effective_spindle_count)

### 2. PostgreSQL Configuration

Add to `postgresql.conf`:

```conf
# Connection Settings
max_connections = 100
shared_buffers = 256MB

# Performance
effective_cache_size = 1GB
maintenance_work_mem = 128MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
random_page_cost = 1.1

# Logging
log_slow_queries = on
log_min_duration_statement = 100  # Log queries slower than 100ms
```

### 3. Index Maintenance

Run weekly:

```sql
-- Update statistics
ANALYZE;

-- Reindex if needed
REINDEX DATABASE korusdb;

-- Clean up dead rows
VACUUM ANALYZE;
```

## Monitoring Queries

### Check Active Connections:

```sql
SELECT count(*) FROM pg_stat_activity;
```

### Find Slow Queries:

```sql
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Check Index Usage:

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan;
```

## Backup Strategy

### Daily Backups:

```bash
# Backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="korusdb"

pg_dump $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
```

### Point-in-Time Recovery:

Enable WAL archiving for PITR:

```conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /archive/%f'
```

## Production Checklist

- [ ] Connection pooling configured
- [ ] Indexes created (run migration script)
- [ ] Backup strategy implemented
- [ ] Monitoring enabled
- [ ] Slow query logging active
- [ ] SSL enabled for connections
- [ ] Read replicas configured (if needed)
- [ ] Failover strategy in place