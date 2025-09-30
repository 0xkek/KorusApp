-- Add shoutout fields to posts table
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "isShoutout" BOOLEAN DEFAULT false;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "shoutoutDuration" INTEGER;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "shoutoutExpiresAt" TIMESTAMP(3);
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "shoutoutPrice" DECIMAL(18,6);

-- Create index for efficient shoutout queries
CREATE INDEX IF NOT EXISTS "posts_shoutout_idx" ON "posts" ("isShoutout", "shoutoutExpiresAt" DESC);