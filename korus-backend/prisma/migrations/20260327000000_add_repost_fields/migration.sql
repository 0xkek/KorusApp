-- AlterTable
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "isRepost" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "originalPostId" TEXT;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "originalReplyId" TEXT;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "repostCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "repostComment" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "posts_originalPostId_idx" ON "posts"("originalPostId");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_originalPostId_fkey" FOREIGN KEY ("originalPostId") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
