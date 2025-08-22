-- AlterTable
ALTER TABLE "users" ADD COLUMN "pushToken" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "idx_users_push_token" ON "users"("pushToken") WHERE "pushToken" IS NOT NULL;