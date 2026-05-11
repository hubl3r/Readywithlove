-- prisma/migrations/20260510160000_message_drafts_quota/migration.sql

-- Add tokenized delivery + approval link fields, plus reminder counter
ALTER TABLE "Message" ADD COLUMN "deliveryToken" TEXT;
ALTER TABLE "Message" ADD COLUMN "approvalToken" TEXT;
ALTER TABLE "Message" ADD COLUMN "approvalRemindersSent" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "Message_deliveryToken_key" ON "Message"("deliveryToken");
CREATE UNIQUE INDEX "Message_approvalToken_key" ON "Message"("approvalToken");
CREATE INDEX "Message_deliveryToken_idx" ON "Message"("deliveryToken");
CREATE INDEX "Message_approvalToken_idx" ON "Message"("approvalToken");
