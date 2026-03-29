-- Add lastMoveAt field to games table for 10-minute move timeout enforcement
ALTER TABLE "games" ADD COLUMN "lastMoveAt" TIMESTAMP(3);

-- Backfill active games with updatedAt so they don't immediately timeout
UPDATE "games" SET "lastMoveAt" = "updatedAt" WHERE "status" = 'active';

-- Add index for efficient timeout queries
CREATE INDEX "games_status_lastMoveAt_idx" ON "games"("status", "lastMoveAt");
