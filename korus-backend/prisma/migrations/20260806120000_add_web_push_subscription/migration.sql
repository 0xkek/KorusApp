-- Browser Push API subscription payload (endpoint + keys) stored as JSON.
-- Separate from pushToken, which holds Expo tokens for the mobile app.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "webPushSubscription" JSONB;
