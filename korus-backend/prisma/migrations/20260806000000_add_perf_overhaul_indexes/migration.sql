-- Performance overhaul indexes.
-- These were declared in schema.prisma but never applied to the database
-- (they only existed as a loose .sql file, which `prisma migrate deploy` skips).
-- CONCURRENTLY is intentionally NOT used: Prisma runs migrations in a
-- transaction, and CREATE INDEX CONCURRENTLY cannot run inside one.
-- These tables are small enough that the brief lock is not a concern.

-- User model: for mention resolution and username search
CREATE INDEX IF NOT EXISTS "users_username_idx" ON "users"("username");
CREATE INDEX IF NOT EXISTS "users_snsUsername_idx" ON "users"("snsUsername");

-- Reply model: for filtered thread queries (postId + isHidden + createdAt DESC)
CREATE INDEX IF NOT EXISTS "replies_postId_isHidden_createdAt_idx" ON "replies"("postId", "isHidden", "createdAt" DESC);
