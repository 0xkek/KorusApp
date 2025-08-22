-- Add push notification token to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pushToken" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pushNotificationsEnabled" BOOLEAN DEFAULT true;

-- Index for finding users by push token
CREATE INDEX IF NOT EXISTS idx_users_push_token ON "users" ("pushToken") WHERE "pushToken" IS NOT NULL;