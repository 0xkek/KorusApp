-- Check and create SponsoredPost table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sponsored_posts') THEN
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
    END IF;
END $$;

-- Add unique constraint for postId if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'sponsored_posts_postId_key') THEN
        CREATE UNIQUE INDEX "sponsored_posts_postId_key" ON "sponsored_posts"("postId");
    END IF;
END $$;

-- Add foreign key to posts table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sponsored_posts_postId_fkey') THEN
        ALTER TABLE "sponsored_posts" 
        ADD CONSTRAINT "sponsored_posts_postId_fkey" 
        FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Check and create Game table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'games') THEN
        CREATE TABLE "games" (
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
    END IF;
END $$;

-- Add unique constraint for postId if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'games_postId_key') THEN
        CREATE UNIQUE INDEX "games_postId_key" ON "games"("postId");
    END IF;
END $$;

-- Add indexes for games if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'games_status_createdAt_idx') THEN
        CREATE INDEX "games_status_createdAt_idx" ON "games"("status", "createdAt" DESC);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'games_player1_status_idx') THEN
        CREATE INDEX "games_player1_status_idx" ON "games"("player1", "status");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'games_player2_status_idx') THEN
        CREATE INDEX "games_player2_status_idx" ON "games"("player2", "status");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'games_gameType_status_idx') THEN
        CREATE INDEX "games_gameType_status_idx" ON "games"("gameType", "status");
    END IF;
END $$;

-- Add foreign keys for games if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'games_postId_fkey') THEN
        ALTER TABLE "games" 
        ADD CONSTRAINT "games_postId_fkey" 
        FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'games_player1_fkey') THEN
        ALTER TABLE "games" 
        ADD CONSTRAINT "games_player1_fkey" 
        FOREIGN KEY ("player1") REFERENCES "users"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'games_player2_fkey') THEN
        ALTER TABLE "games" 
        ADD CONSTRAINT "games_player2_fkey" 
        FOREIGN KEY ("player2") REFERENCES "users"("walletAddress") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'games_winner_fkey') THEN
        ALTER TABLE "games" 
        ADD CONSTRAINT "games_winner_fkey" 
        FOREIGN KEY ("winner") REFERENCES "users"("walletAddress") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;