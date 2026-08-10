-- Per-account light/dark preference.
--
-- Stored on the user rather than the device so it follows them, and because
-- the mobile app deliberately persists nothing locally.
--
-- Additive and nullable, so existing rows are untouched and the currently
-- deployed code keeps working after this is applied. Null means "follow the
-- operating system", which is the previous behaviour.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "themeMode" VARCHAR(10);
