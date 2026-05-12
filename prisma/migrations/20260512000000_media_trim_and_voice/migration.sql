-- prisma/migrations/20260512000000_media_trim_and_voice/migration.sql

-- Trim handles for video playback. Both nullable: when null, the full video
-- plays from start to end. When set, the viewer enforces these bounds on
-- the <video> element's currentTime + ended events. The underlying blob is
-- NOT trimmed — only the playback is. Cheap, reversible, and avoids any
-- server-side re-encoding.

ALTER TABLE "Message"      ADD COLUMN "mediaTrimStartSec" INTEGER;
ALTER TABLE "Message"      ADD COLUMN "mediaTrimEndSec"   INTEGER;
ALTER TABLE "Contribution" ADD COLUMN "mediaTrimStartSec" INTEGER;
ALTER TABLE "Contribution" ADD COLUMN "mediaTrimEndSec"   INTEGER;

-- Preferred TTS voice. Identified by voiceURI from the Web Speech API,
-- which is opaque (e.g. "Google US English" or "com.apple.voice.compact.en-US.Samantha").
-- Stored as a plain string — null means "auto-pick the best available".
ALTER TABLE "Settings" ADD COLUMN "preferredVoiceURI" TEXT;
