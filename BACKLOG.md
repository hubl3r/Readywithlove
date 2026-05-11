# ReadyWithLove · Backlog

Items deferred from earlier work, captured here so they don't get lost.

## Pages to build (post-launch prep)

- [ ] Contact Us page — simple form, sends to `support@readywithlove.com` when that exists
- [ ] FAQ page — what happens to my data, how does executor verification work, etc.
- [ ] Support page (`/support`) — referenced by email footers; can start as a redirect to Contact Us
- [ ] Pricing page — plan tiers (basic / advanced / premium) with photo + message limits

## Infrastructure / accounts

- [ ] **Form an LLC before launch.** Currently operating as TN sole proprietor — personal
      liability for any data breach or mishandled message. ~$300 filing fee in TN.
- [ ] Email forwarding for `support@readywithlove.com` and `notifications@readywithlove.com`
      (Cloudflare Email Routing recommended once DNS is ready; manual reply is fine for now)
- [ ] Gmail "Send mail as" so replies from Gmail appear to come from `@readywithlove.com`
- [ ] Vendor partnership for death certificate verification (LexisNexis / Veritas Vital Records / TN Dept of Health API)

## Code / features deferred

- [ ] **Vault references on Timeline milestones** — let user attach a Vault doc to a milestone
      (UI placeholder + schema in Zip 5)
- [ ] **Sticker marketplace** — currently free base set only; store stub returns "coming soon"
- [ ] **Real death certificate verification** — Zip 2a stubs the state machine; integration
      with a vital records vendor happens later
- [ ] **HEIC photo support** — iOS shares as JPEG via file picker so this rarely matters,
      but if users complain, add `heic2any` conversion in `lib/imageCompress.ts`
- [ ] **Thorough high-contrast pass** — refactor pages to use brand-token utility
      classes (or CSS variables) instead of hardcoded Tailwind arbitrary values
      (`bg-[#f5f1e8]`) so the High Contrast setting can fully theme the app.
      Current implementation darkens text and borders but not most backgrounds.
- [ ] **Photo thumbnails** — currently we serve the full compressed image everywhere.
      Generate a 400px-edge thumbnail on upload and store `thumbnailUrl` (column already
      exists on Photo model). Saves bandwidth on grids and lists.
- [ ] **Connection pooling for the Postgres-bound death-check cron** — currently the cron
      reuses the same `lib/prisma.ts` pool, which is fine, but if we ever batch-process
      thousands of users we'll want a dedicated batch connection.

## Legal documents (Zip 1.5)

- [ ] Terms of Service (TN sole prop draft → lawyer review → swap for LLC version)
- [ ] Privacy Policy
- [ ] Content Policy
- [ ] Data Retention & Deletion Policy (post-death procedures)
- [ ] Acceptable Use Policy
- [ ] Accessibility Statement
- [ ] Cookie Policy
- [ ] Video & Audio Consent Policy
- [ ] Community Guidelines (for future events/partnerships)

## Nice-to-haves (no urgency)

- [ ] Photo flipbook background music option
- [ ] Per-milestone music for slideshow mode
- [ ] Memorial wall (post-death public page for tributes)
- [ ] iOS/Android native apps
