-- AlterTable: Make externalLink optional on events
ALTER TABLE "events" ALTER COLUMN "externalLink" DROP NOT NULL;
