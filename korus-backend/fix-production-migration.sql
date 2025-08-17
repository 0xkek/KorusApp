-- Manually mark the migration as applied if tables already exist
-- This should be run directly on the production database

-- Check if tables exist and update migration history
DO $$
BEGIN
    -- Check if sponsored_posts table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sponsored_posts') THEN
        -- Mark migration as applied
        UPDATE "_prisma_migrations" 
        SET finished_at = NOW(), 
            applied_steps_count = 1,
            logs = NULL
        WHERE migration_name = '20250817000000_add_sponsored_games'
        AND finished_at IS NULL;
        
        RAISE NOTICE 'Migration 20250817000000_add_sponsored_games marked as applied';
    ELSE
        -- If table doesn't exist, delete the failed migration record so it can be retried
        DELETE FROM "_prisma_migrations" 
        WHERE migration_name = '20250817000000_add_sponsored_games'
        AND finished_at IS NULL;
        
        RAISE NOTICE 'Failed migration record deleted, ready for retry';
    END IF;
END $$;