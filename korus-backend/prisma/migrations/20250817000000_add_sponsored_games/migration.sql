-- Add SponsoredPost table
CREATE TABLE IF NOT EXISTS "sponsored_posts" (
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

-- Add unique constraint for postId
CREATE UNIQUE INDEX IF NOT EXISTS "sponsored_posts_postId_key" ON "sponsored_posts"("postId");

-- Add foreign key to posts table
ALTER TABLE "sponsored_posts" 
ADD CONSTRAINT "sponsored_posts_postId_fkey" 
FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add Game table
CREATE TABLE IF NOT EXISTS "games" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "gameType" VARCHAR(20) NOT NULL,
    "player1" VARCHAR(44) NOT NULL,
    "player2" VARCHAR(44),
    "currentTurn" VARCHAR(44),
    "gameState" JSONB NOT NULL,
    "wager" DECIMAL(18,6) NOT NULL,
    "winner" VARCHAR(44),
    "status" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint for postId
CREATE UNIQUE INDEX IF NOT EXISTS "games_postId_key" ON "games"("postId");

-- Add indexes for games
CREATE INDEX IF NOT EXISTS "games_status_createdAt_idx" ON "games"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "games_player1_status_idx" ON "games"("player1", "status");
CREATE INDEX IF NOT EXISTS "games_player2_status_idx" ON "games"("player2", "status");
CREATE INDEX IF NOT EXISTS "games_gameType_status_idx" ON "games"("gameType", "status");

-- Add foreign keys for games
ALTER TABLE "games" 
ADD CONSTRAINT "games_postId_fkey" 
FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "games" 
ADD CONSTRAINT "games_player1_fkey" 
FOREIGN KEY ("player1") REFERENCES "users"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "games" 
ADD CONSTRAINT "games_player2_fkey" 
FOREIGN KEY ("player2") REFERENCES "users"("walletAddress") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "games" 
ADD CONSTRAINT "games_winner_fkey" 
FOREIGN KEY ("winner") REFERENCES "users"("walletAddress") ON DELETE SET NULL ON UPDATE CASCADE;