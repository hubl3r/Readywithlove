-- Add Settings.arrFinalMessage — the user's optional note to whoever opens
-- the Arrangements section after their death. Rendered at the bottom of
-- /dashboard/arrangements for editing, and at the top of the executor
-- preview view (2d.4) for reading. Nullable; empty/null means no note.

ALTER TABLE "Settings"
  ADD COLUMN IF NOT EXISTS "arrFinalMessage" TEXT;
