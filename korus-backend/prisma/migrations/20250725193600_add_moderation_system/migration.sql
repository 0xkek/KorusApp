-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isSuspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suspensionReason" TEXT,
ADD COLUMN     "suspendedUntil" TIMESTAMP(3),
ADD COLUMN     "warningCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable  
ALTER TABLE "posts" ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "moderationReason" TEXT,
ADD COLUMN     "flaggedCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "replies" ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "moderationReason" TEXT,
ADD COLUMN     "flaggedCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" TEXT NOT NULL,
    "moderatorWallet" VARCHAR(44) NOT NULL,
    "targetType" VARCHAR(10) NOT NULL,
    "targetId" TEXT NOT NULL,
    "actionType" VARCHAR(20) NOT NULL,
    "reason" TEXT NOT NULL,
    "duration" INTEGER,
    "reportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_isSuspended_suspendedUntil_idx" ON "users"("isSuspended", "suspendedUntil");

-- CreateIndex  
CREATE INDEX "posts_isHidden_createdAt_idx" ON "posts"("isHidden", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_flaggedCount_idx" ON "posts"("flaggedCount" DESC);

-- CreateIndex
CREATE INDEX "replies_isHidden_createdAt_idx" ON "replies"("isHidden", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "replies_flaggedCount_idx" ON "replies"("flaggedCount" DESC);

-- CreateIndex
CREATE INDEX "moderation_actions_targetType_targetId_idx" ON "moderation_actions"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "moderation_actions_moderatorWallet_createdAt_idx" ON "moderation_actions"("moderatorWallet", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "moderation_actions_actionType_createdAt_idx" ON "moderation_actions"("actionType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "moderation_actions_reportId_idx" ON "moderation_actions"("reportId");

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_moderatorWallet_fkey" FOREIGN KEY ("moderatorWallet") REFERENCES "users"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey  
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "users"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;