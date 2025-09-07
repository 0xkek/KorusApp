-- Enable citext extension for case-insensitive text
CREATE EXTENSION IF NOT EXISTS citext;

-- Add username column to User table
ALTER TABLE "users" ADD COLUMN "username" citext;

-- Create unique index for username (case-insensitive due to citext)
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- Add check constraint for username format (alphanumeric only, 3-20 chars)
-- Note: We'll validate length and format in application code for better error messages
ALTER TABLE "users" ADD CONSTRAINT "username_format" 
  CHECK (username ~ '^[a-zA-Z0-9]{3,20}$' OR username IS NULL);