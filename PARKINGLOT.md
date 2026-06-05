# ReadyWithLove · Parking Lot

Ideas, half-thoughts, and "not now" items captured so they don't get lost or
derail the current chunk. Nothing here is committed work — it's a holding pen.

**Flow:** idea → park it here → if we decide to do it, it graduates into a phase
in `PLAN.md` and gets removed from this list.

---

## Feature ideas

- Photo flipbook background music option
- Per-milestone music for slideshow mode
- Memorial wall — post-death public page for tributes
- iOS / Android native apps
- Sticker marketplace (currently free base set only; store stub says "coming soon")
- Vault references on Timeline milestones (attach a Vault doc to a milestone;
  UI placeholder + schema already stubbed)

## Tech / infra ideas

- Photo thumbnails — generate a 400px-edge thumbnail on upload, store
  `thumbnailUrl` (column already exists). Saves bandwidth on grids.
- HEIC photo support via `heic2any` in `lib/imageCompress.ts` (only if users complain)
- Dedicated batch DB connection for the death-check cron if it ever processes
  thousands of users
- Thorough high-contrast theming pass using brand tokens / CSS variables instead
  of hardcoded Tailwind arbitrary values (`bg-[#f5f1e8]`)

## Questions to resolve

- Where does the Vault encryption key live? (affects Phase 3 design)
- Which death-certificate verification vendor? (LexisNexis / Veritas Vital
  Records / TN Dept of Health API)
- What to do with `Ready Handover.zip` in the repo root?

## New ideas (add below)

<!-- date — idea -->
