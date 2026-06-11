-- prisma/migrations/20260521_arrangements_2d1/migration.sql
--
-- Zip 2d.1 — Arrangements foundation.
--
-- Destructive rebuild of the Arrangement table. The previous shape
-- (id, userId, type, vendor, contact, notes, createdAt) was a placeholder
-- and held no production data worth preserving. We drop and recreate
-- with the proper shape for the new module.
--
-- Reminder: in this project, dev DB === prod DB. Running this applies
-- to production. Expected.

DROP TABLE IF EXISTS "Arrangement" CASCADE;

CREATE TABLE "Arrangement" (
  "id"                          TEXT        NOT NULL,
  "userId"                      TEXT        NOT NULL,
  "category"                    TEXT        NOT NULL,
  "title"                       TEXT        NOT NULL,
  "status"                      TEXT        NOT NULL DEFAULT 'planned',
  "isCore"                      BOOLEAN     NOT NULL DEFAULT false,
  "executorVisibleAfterDeath"   BOOLEAN     NOT NULL DEFAULT true,
  "structuredData"              JSONB,
  "vendor"                      TEXT,
  "contact"                     TEXT,
  "notes"                       TEXT,
  "sortOrder"                   INTEGER     NOT NULL DEFAULT 0,
  "createdAt"                   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Arrangement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Arrangement_userId_idx" ON "Arrangement"("userId");
CREATE INDEX "Arrangement_userId_category_idx" ON "Arrangement"("userId", "category");

ALTER TABLE "Arrangement"
  ADD CONSTRAINT "Arrangement_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Section acknowledgements live on Settings so we don't need a whole new
-- table for five booleans. The "acknowledge this section" UX in 2d.3 will
-- flip these. Default false = section hasn't been visited yet.
ALTER TABLE "Settings"
  ADD COLUMN IF NOT EXISTS "arrSeededAt"            TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "arrAckDisposition"      BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "arrAckService"          BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "arrAckNotifications"    BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "arrAckLegal"            BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "arrAckWishes"           BOOLEAN     NOT NULL DEFAULT false;
