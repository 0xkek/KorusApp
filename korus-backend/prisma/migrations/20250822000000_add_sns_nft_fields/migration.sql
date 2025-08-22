-- Add SNS username and NFT avatar fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "snsUsername" VARCHAR(100);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "nftAvatar" TEXT;