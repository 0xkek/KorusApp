-- AlterTable
ALTER TABLE "games" ADD COLUMN "onChainGameId" BIGINT;

-- AddComment
COMMENT ON COLUMN "games"."onChainGameId" IS 'Blockchain game ID (u64)';