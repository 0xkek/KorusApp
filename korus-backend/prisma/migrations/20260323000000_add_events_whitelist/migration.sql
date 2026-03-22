-- CreateTable
CREATE TABLE IF NOT EXISTS "events" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "projectName" VARCHAR(100) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" VARCHAR(500),
    "externalLink" VARCHAR(500) NOT NULL,
    "maxSpots" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "selectionMethod" VARCHAR(20) NOT NULL,
    "requirements" JSONB,
    "minReputation" INTEGER,
    "minAccountAge" INTEGER,
    "creatorWallet" VARCHAR(44) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "registrationCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "whitelist_registrations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "walletAddress" VARCHAR(44) NOT NULL,
    "signature" TEXT NOT NULL,
    "signedMessage" TEXT NOT NULL,
    "reputationScore" INTEGER NOT NULL,
    "accountAge" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'registered',
    "position" INTEGER,
    "selectedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whitelist_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "whitelist_registrations_signature_key" ON "whitelist_registrations"("signature");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "events_type_status_startDate_idx" ON "events"("type", "status", "startDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "events_creatorWallet_createdAt_idx" ON "events"("creatorWallet", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "events_status_endDate_idx" ON "events"("status", "endDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "events_featured_status_startDate_idx" ON "events"("featured", "status", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "whitelist_registrations_eventId_walletAddress_key" ON "whitelist_registrations"("eventId", "walletAddress");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whitelist_registrations_eventId_status_registeredAt_idx" ON "whitelist_registrations"("eventId", "status", "registeredAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whitelist_registrations_walletAddress_registeredAt_idx" ON "whitelist_registrations"("walletAddress", "registeredAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whitelist_registrations_eventId_position_idx" ON "whitelist_registrations"("eventId", "position");

-- AddForeignKey
ALTER TABLE "whitelist_registrations" ADD CONSTRAINT "whitelist_registrations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
