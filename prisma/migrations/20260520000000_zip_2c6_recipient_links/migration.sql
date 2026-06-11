-- Zip 2c.6: recipient links + contribution notifications
ALTER TABLE "Message" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Message" ADD COLUMN "linkRevokedAt" TIMESTAMP(3);
ALTER TABLE "Settings" ADD COLUMN "notifyOnContribution" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Contribution" ADD COLUMN "notifyEmailedAt" TIMESTAMP(3);