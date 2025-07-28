-- AlterTable: Change from daily to weekly reputation tracking
ALTER TABLE "users" 
  DROP COLUMN IF EXISTS "dailyRepEarned",
  ADD COLUMN "weeklyRepEarned" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "weekStartDate" TIMESTAMP(3);

-- CreateTable: WeeklyRepPool for tracking weekly revenue and distributions
CREATE TABLE "weekly_rep_pools" (
    "id" TEXT NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "weekEndDate" DATE NOT NULL,
    "distributionDate" DATE NOT NULL,
    "sponsoredPostRevenue" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "gameFeesCollected" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "eventFeesCollected" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "platformFeePercent" INTEGER NOT NULL DEFAULT 50,
    "totalPoolSize" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "totalRepGenerated" INTEGER NOT NULL DEFAULT 0,
    "participantCount" INTEGER NOT NULL DEFAULT 0,
    "distributed" BOOLEAN NOT NULL DEFAULT false,
    "distributedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_rep_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SponsoredPost for tracking ad revenue
CREATE TABLE "sponsored_posts" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "sponsorWallet" VARCHAR(44) NOT NULL,
    "campaignName" VARCHAR(100) NOT NULL,
    "pricePaid" DECIMAL(18,6) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "targetViews" INTEGER NOT NULL DEFAULT 0,
    "actualViews" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "weekNumber" INTEGER NOT NULL,
    "yearNumber" INTEGER NOT NULL,
    "revenueShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsored_posts_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Update TokenDistribution for weekly tracking
ALTER TABLE "token_distributions" 
  DROP COLUMN IF EXISTS "date",
  ADD COLUMN "weekStartDate" DATE NOT NULL,
  ADD COLUMN "weekEndDate" DATE NOT NULL,
  ADD COLUMN "distributionDate" DATE NOT NULL,
  ADD COLUMN "weeklyPoolSize" DECIMAL(18,6) NOT NULL,
  ADD COLUMN "totalParticipants" INTEGER NOT NULL;

-- DropTable: Remove daily pools if exists
DROP TABLE IF EXISTS "daily_rep_pools";

-- CreateIndex
CREATE UNIQUE INDEX "weekly_rep_pools_weekStartDate_key" ON "weekly_rep_pools"("weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "sponsored_posts_postId_key" ON "sponsored_posts"("postId");

-- CreateIndex
CREATE INDEX "sponsored_posts_weekNumber_yearNumber_revenueShared_idx" ON "sponsored_posts"("weekNumber", "yearNumber", "revenueShared");

-- CreateIndex
CREATE INDEX "sponsored_posts_startDate_endDate_idx" ON "sponsored_posts"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "token_distributions_userWallet_weekStartDate_key" ON "token_distributions"("userWallet", "weekStartDate");

-- CreateIndex
CREATE INDEX "token_distributions_userWallet_distributionDate_idx" ON "token_distributions"("userWallet", "distributionDate" DESC);

-- CreateIndex
CREATE INDEX "token_distributions_weekStartDate_weekEndDate_idx" ON "token_distributions"("weekStartDate", "weekEndDate");

-- CreateIndex
CREATE INDEX "users_weeklyRepEarned_weekStartDate_idx" ON "users"("weeklyRepEarned" DESC, "weekStartDate");

-- AddForeignKey
ALTER TABLE "sponsored_posts" ADD CONSTRAINT "sponsored_posts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;