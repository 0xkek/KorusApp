-- Add expiresAt field to Game model
ALTER TABLE "games" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Set expiresAt for existing waiting games (2 hours from creation)
UPDATE "games"
SET "expiresAt" = "createdAt" + INTERVAL '2 hours'
WHERE "status" = 'waiting' AND "expiresAt" IS NULL;
