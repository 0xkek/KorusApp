-- Add shoutout score column to users
ALTER TABLE "users" ADD COLUMN "shoutoutScore" INTEGER NOT NULL DEFAULT 0;
