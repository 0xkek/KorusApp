-- CreateTable
CREATE TABLE IF NOT EXISTS "platform_config" (
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_config_pkey" PRIMARY KEY ("key")
);

-- Seed default event creation fee
INSERT INTO "platform_config" ("key", "value", "updatedAt")
VALUES ('event_creation_fee', '0.1', NOW())
ON CONFLICT ("key") DO NOTHING;
