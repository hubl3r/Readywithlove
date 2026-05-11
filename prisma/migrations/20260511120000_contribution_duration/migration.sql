-- prisma/migrations/20260511120000_contribution_duration/migration.sql

-- Add mediaDurationSec to Contribution so we can show "Video · 2:13"
-- in the From-others tab without inferring it from the file. Nullable —
-- only set for type='video' contributions.

ALTER TABLE "Contribution" ADD COLUMN "mediaDurationSec" INTEGER;
