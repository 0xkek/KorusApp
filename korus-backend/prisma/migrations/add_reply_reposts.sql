-- Reposting a reply.
--
-- A repost is already a Post row that points at the thing being reposted, so a
-- reply repost is the same shape: a Post carrying originalReplyId instead of
-- originalPostId. That keeps reply reposts visible in the feed alongside post
-- reposts and needs no change to how the feed is queried.
--
-- Purely additive: every column is nullable or defaulted, so existing rows are
-- untouched and the old code keeps working after this is applied.

ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "originalReplyId" TEXT;

ALTER TABLE "replies" ADD COLUMN IF NOT EXISTS "repostCount" INTEGER NOT NULL DEFAULT 0;

-- Deleting a reply removes its reposts, matching the reply -> post cascade.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_originalReplyId_fkey'
  ) THEN
    ALTER TABLE "posts"
      ADD CONSTRAINT "posts_originalReplyId_fkey"
      FOREIGN KEY ("originalReplyId") REFERENCES "replies"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "posts_originalReplyId_idx" ON "posts"("originalReplyId");
