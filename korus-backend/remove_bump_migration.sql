-- Migration to remove bump system from the database
-- Run this migration when the database is available using:
-- cd korus-backend && npx prisma migrate dev --name remove_bump_system

-- Remove bump columns from posts table
ALTER TABLE "posts" 
DROP COLUMN IF EXISTS "bumped",
DROP COLUMN IF EXISTS "bumpedAt",
DROP COLUMN IF EXISTS "bumpExpiresAt",
DROP COLUMN IF EXISTS "bumpCount";

-- Update interaction type constraint to remove 'bump' as a valid option
-- First, we need to drop any existing interactions with type 'bump'
DELETE FROM "interactions" WHERE "interactionType" = 'bump';

-- Then update the check constraint (if one exists)
-- Note: The exact constraint update depends on your database setup
-- You may need to recreate the constraint or modify the enum type