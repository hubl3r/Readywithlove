-- Zip 2c.6: recipient links + contribution notifications
--
-- Adds:
--   Message.viewCount         — cumulative recipient page views
--   Message.linkRevokedAt     — sender-initiated revoke timestamp
--   Settings.notifyOnContribution — opt-out toggle for new-contribution emails
--   Contribution.notifyEmailedAt — timestamp of the last notification email
--                                  sent to the owner for this invite (used for
--                                  15-minute dedupe so back-to-back submissions
--                                  from one contributor don't fire multiple
--                                  emails). Stored on Contribution because we
--                                  already join through invite to find recent
--                                  ones cheaply; alternative was on
--                                  MessageInvite but that gets revoked which
--                                  would lose the dedupe history.

ALTER TABLE "Message" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Message" ADD COLUMN "linkRevokedAt" TIMESTAMP(3);

ALTER TABLE "Settings" ADD COLUMN "notifyOnContribution" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Contribution" ADD COLUMN "notifyEmailedAt" TIMESTAMP(3);
