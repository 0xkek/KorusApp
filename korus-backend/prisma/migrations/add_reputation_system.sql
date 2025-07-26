-- Add reputation fields to User model
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reputationScore" INTEGER DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "contentScore" INTEGER DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "engagementScore" INTEGER DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "communityScore" INTEGER DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "loyaltyScore" INTEGER DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dailyRepEarned" INTEGER DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastRepUpdate" TIMESTAMP DEFAULT NOW();
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "loginStreak" INTEGER DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastLoginDate" DATE;

-- Create RepEvent table for tracking reputation events
CREATE TABLE IF NOT EXISTS "rep_events" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userWallet" VARCHAR(44) NOT NULL,
  "eventType" VARCHAR(50) NOT NULL,
  "category" VARCHAR(20) NOT NULL, -- content, engagement, community, loyalty
  "points" INTEGER NOT NULL,
  "multiplier" DECIMAL(3,2) DEFAULT 1.0,
  "description" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY ("userWallet") REFERENCES "users"("walletAddress") ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rep_events_user_date ON "rep_events"("userWallet", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_rep_events_type ON "rep_events"("eventType");
CREATE INDEX IF NOT EXISTS idx_rep_events_daily ON "rep_events"(DATE("createdAt"), "userWallet");

-- Update user reputation score index
CREATE INDEX IF NOT EXISTS idx_users_reputation ON "users"("reputationScore" DESC);
CREATE INDEX IF NOT EXISTS idx_users_daily_rep ON "users"("dailyRepEarned" DESC, "lastRepUpdate");

-- Create DailyRepPool table for token distribution
CREATE TABLE IF NOT EXISTS "daily_rep_pools" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "date" DATE NOT NULL UNIQUE,
  "totalPoolSize" DECIMAL(18,6) DEFAULT 10000, -- 10k ALLY daily
  "totalRepGenerated" INTEGER DEFAULT 0,
  "participantCount" INTEGER DEFAULT 0,
  "distributed" BOOLEAN DEFAULT FALSE,
  "distributedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Create TokenDistribution table to track daily distributions
CREATE TABLE IF NOT EXISTS "token_distributions" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userWallet" VARCHAR(44) NOT NULL,
  "date" DATE NOT NULL,
  "repEarned" INTEGER NOT NULL,
  "sharePercentage" DECIMAL(6,4) NOT NULL, -- e.g., 5.25%
  "tokensEarned" DECIMAL(18,6) NOT NULL,
  "claimed" BOOLEAN DEFAULT FALSE,
  "claimedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY ("userWallet") REFERENCES "users"("walletAddress") ON DELETE CASCADE,
  UNIQUE("userWallet", "date")
);

CREATE INDEX IF NOT EXISTS idx_token_dist_user ON "token_distributions"("userWallet", "date" DESC);
CREATE INDEX IF NOT EXISTS idx_token_dist_unclaimed ON "token_distributions"("claimed", "userWallet");