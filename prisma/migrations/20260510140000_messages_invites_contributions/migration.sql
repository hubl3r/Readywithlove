-- prisma/migrations/20260510140000_messages_invites_contributions/migration.sql

-- 1. User: add death-state fields (nullable, no backfill needed)
ALTER TABLE "User" ADD COLUMN "pendingDeathVerificationAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "deceasedAt" TIMESTAMP(3);

-- 2. Message: extend with state machine + media fields.
-- Existing rows had: id, userId, recipientName, recipientEmail, content,
-- mediaUrl, triggerDate, triggerEvent, delivered, createdAt
-- We're keeping all those columns and adding new ones.

-- Add new columns (nullable or with safe defaults so existing rows survive)
ALTER TABLE "Message" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'letter';
ALTER TABLE "Message" ADD COLUMN "subject" TEXT;
ALTER TABLE "Message" ADD COLUMN "mediaBlobPath" TEXT;
ALTER TABLE "Message" ADD COLUMN "mediaDurationSec" INTEGER;
ALTER TABLE "Message" ADD COLUMN "state" TEXT NOT NULL DEFAULT 'drafting';
ALTER TABLE "Message" ADD COLUMN "approvalPromptedAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "approvalExpiresAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "sentAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Migrate any existing rows: if delivered=true, state=sent; else if has triggerDate, scheduled; else drafting
UPDATE "Message" SET "state" = 'sent', "sentAt" = "createdAt" WHERE "delivered" = true;
UPDATE "Message" SET "state" = 'scheduled' WHERE "delivered" = false AND "triggerDate" IS NOT NULL;

-- Drop the now-redundant `delivered` and `triggerEvent` columns
ALTER TABLE "Message" DROP COLUMN "delivered";
ALTER TABLE "Message" DROP COLUMN "triggerEvent";

-- Indexes for cron lookups
CREATE INDEX "Message_userId_idx" ON "Message"("userId");
CREATE INDEX "Message_state_triggerDate_idx" ON "Message"("state", "triggerDate");

-- 3. MessageInvite
CREATE TABLE "MessageInvite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "contributorName" TEXT NOT NULL,
    "contributorEmail" TEXT,
    "message" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MessageInvite_token_key" ON "MessageInvite"("token");
CREATE INDEX "MessageInvite_userId_idx" ON "MessageInvite"("userId");
CREATE INDEX "MessageInvite_token_idx" ON "MessageInvite"("token");

ALTER TABLE "MessageInvite" ADD CONSTRAINT "MessageInvite_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Contribution
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "contributorName" TEXT NOT NULL,
    "contributorNote" TEXT,
    "type" TEXT NOT NULL,
    "content" TEXT,
    "mediaUrl" TEXT,
    "mediaBlobPath" TEXT,
    "viewedByUser" BOOLEAN NOT NULL DEFAULT false,
    "importedToTimelineItemId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Contribution_userId_idx" ON "Contribution"("userId");
CREATE INDEX "Contribution_inviteId_idx" ON "Contribution"("inviteId");

ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_inviteId_fkey"
  FOREIGN KEY ("inviteId") REFERENCES "MessageInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
