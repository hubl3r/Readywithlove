# ReadyWithLove · Completion Plan

The roadmap from current state to launch, broken into **phases** sized for
frequent handoffs. Features first, polish second. Each milestone is small enough
to finish, confirm, and push in a single working session.

**Companion docs:** `HANDOFF.md` (live state between chats) · `RULES.md`
(workflow + do/don't) · `PARKINGLOT.md` (ideas) · `BACKLOG.md` (older deferred list).

---

## The milestone gate (run at the end of every phase)

Nothing moves to the next phase until all four pass:

1. **Build** the chunk.
2. **Confirm locally** — `npm run dev`, click through the feature by hand.
   Optionally `npm run verify` (lint + production build) to catch type errors.
3. **Ship** — `npm run ship "phase X: short summary"` → pushes to `main` →
   Vercel auto-deploys.
4. **Confirm live** — open the Vercel production URL and re-test the feature
   there before starting the next phase.

Then update `HANDOFF.md` and check the box below.

---

## Current state (snapshot)

**Built & shipped:** Landing page, Dashboard, Timeline, Messages (drafts,
invites, contributions, approval, delivery cron), Contributions, Settings,
AI text cleanup.

**In progress (uncommitted in working tree):** Arrangements — `ArrangementsView.tsx`,
seed API/lib, schema model, two migrations.

**Stubbed in nav (not built):** Contacts, Vault, Executor.

**Nav order is the product roadmap:** Dashboard · Timeline · Messages ·
Contributions · Contacts · Arrangements · Vault · Executor.

---

## Phase 0 — Project scaffolding ✅ (this session)

- [x] `npm run verify` and `npm run ship` scripts + `scripts/ship.mjs`
- [x] `PLAN.md`, `HANDOFF.md`, `RULES.md`, `PARKINGLOT.md`
- [ ] Commit the scaffolding (first use of `npm run ship`)

---

## Phase 1 — Finish & ship Arrangements

The current WIP. Get it working end to end and off the uncommitted pile.

- [ ] Read the uncommitted Arrangements code; list what's done vs. missing
- [ ] Wire create / edit / delete / reorder against the API
- [ ] Confirm seed flow (`/api/arrangements/seed`) populates the core categories
- [ ] Confirm `prisma migrate` state is clean (two new migrations apply)
- [ ] Empty / loading / error states
- [ ] **Gate** → commit, push, confirm live

---

## Phase 2 — Executor

The person who receives access after death. Core to the whole trigger flow.

- [ ] `Executor` model already exists — build `/dashboard/executor` page + API
- [ ] Add/edit executor (name, email, phone)
- [ ] Invite/notify executor; capture verification status
- [ ] Flip nav `available: true`
- [ ] **Gate** → commit, push, confirm live

---

## Phase 3 — Vault

Encrypted documents the executor unlocks after death.

- [ ] `VaultItem` model exists — build `/dashboard/vault` page + API
- [ ] Add/label/encrypt items; list & delete
- [ ] Decide encryption approach (where the key lives) — note in RULES.md
- [ ] `executorVisibleAfterDeath` linkage groundwork
- [ ] Flip nav `available: true`
- [ ] **Gate** → commit, push, confirm live

---

## Phase 4 — Contacts

Reusable recipients across Messages / Contributions / Executor.

- [ ] `Contact` model exists — build `/dashboard/contacts` page + API
- [ ] CRUD; reuse as recipient picker where messages currently free-type
- [ ] Flip nav `available: true`
- [ ] **Gate** → commit, push, confirm live

---

## Phase 5 — Death-trigger flow (end to end)

Tie it all together: the actual reason the product exists.

- [ ] Map the full path: death signal → executor verification → unlock →
      vault access + message delivery
- [ ] Wire the stubbed death-cert state machine to executor unlock
- [ ] End-to-end test with a throwaway user
- [ ] **Gate** → commit, push, confirm live

---

## Phase 6 — Public / launch pages

- [ ] Contact Us (form → support inbox)
- [ ] FAQ
- [ ] Pricing (plan tiers + photo/message limits)
- [ ] Support (`/support`, referenced by email footers)
- [ ] **Gate** → commit, push, confirm live

---

## Phase 7 — Legal documents

Draft now, lawyer review before public launch.

- [ ] Terms of Service · Privacy Policy · Content Policy
- [ ] Data Retention & Deletion (post-death procedures)
- [ ] Acceptable Use · Accessibility Statement · Cookie Policy
- [ ] Video & Audio Consent
- [ ] **Gate** → commit, push, confirm live

---

## Phase 8 — Polish & tweaks (the "fine tune" pass)

Pulled from BACKLOG once features work.

- [ ] Thorough high-contrast / theming pass (brand tokens, not arbitrary values)
- [ ] Photo thumbnails (`thumbnailUrl` already on Photo model)
- [ ] HEIC support if users hit it
- [ ] Accessibility & performance sweep
- [ ] **Gate** → commit, push, confirm live

---

## Phase 9 — Launch operations (mostly off-code)

- [ ] Form an LLC (TN) before public launch
- [ ] Email forwarding for `support@` / `notifications@readywithlove.com`
- [ ] Gmail "Send mail as" so replies look on-brand
- [ ] Death-certificate verification vendor (LexisNexis / Veritas / TN Dept of Health)
- [ ] Domain / DNS / Vercel production config + final QA
- [ ] **Launch**

---

## How to use this file

- Keep phases in order, but a chunk inside a phase can be its own handoff.
- When a phase ships, check its boxes and move its summary into `HANDOFF.md`.
- New scope goes to `PARKINGLOT.md` first, then graduates into a phase here.
