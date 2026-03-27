-- CreateTable
CREATE TABLE IF NOT EXISTS "follows" (
    "id" TEXT NOT NULL,
    "followerWallet" VARCHAR(44) NOT NULL,
    "followingWallet" VARCHAR(44) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- AddColumns
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "followerCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "followingCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "follows_followerWallet_followingWallet_key" ON "follows"("followerWallet", "followingWallet");
CREATE INDEX IF NOT EXISTS "follows_followerWallet_idx" ON "follows"("followerWallet");
CREATE INDEX IF NOT EXISTS "follows_followingWallet_idx" ON "follows"("followingWallet");

-- AddForeignKeys
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerWallet_fkey" FOREIGN KEY ("followerWallet") REFERENCES "users"("walletAddress") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follows" ADD CONSTRAINT "follows_followingWallet_fkey" FOREIGN KEY ("followingWallet") REFERENCES "users"("walletAddress") ON DELETE CASCADE ON UPDATE CASCADE;
