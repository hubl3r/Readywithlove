# ReadyWithLove · Handoff

**Living state between chats.** A new session should read this top-to-bottom and
be able to pick up immediately. Keep it short and current — overwrite stale info,
don't append history.

> **For a fresh chat:** read `RULES.md` (how we work), then this file (where we
> are), then `PLAN.md` (where we're going). Then continue from "Next action."

---

## At a glance

- **Repo:** `C:\Users\Adam\Documents\.Adam\ReadywithLove` → GitHub `hubl3r/Readywithlove` (branch `main`)
- **Deploy:** push to `main` → Vercel auto-deploys production
- **Stack:** Next.js 16 (App Router), Prisma 7 + Postgres, Clerk auth, Vercel Blob, Resend email
- **Run local:** `npm run dev` · **Verify:** `npm run verify` · **Ship:** `npm run ship "msg"`

---

## Current phase

**Phase 0 — Project scaffolding** (see `PLAN.md`). Setting up handoff/rules/
parking-lot/plan docs and the ship workflow. Next up is **Phase 1 — finish
Arrangements**.

## Last action

Created `PLAN.md`, `HANDOFF.md`, `RULES.md`, `PARKINGLOT.md`, and the
`verify` + `ship` npm scripts (`scripts/ship.mjs`). Not yet committed.

## Next action

1. Commit the scaffolding: `npm run ship "phase 0: project scaffolding + ship workflow"`
2. Start **Phase 1**: read the uncommitted Arrangements code and list done-vs-missing.

## Open threads / watch-outs

- **Uncommitted WIP in the tree:** Arrangements feature (`ArrangementsView.tsx`,
  `app/api/arrangements/`, `app/dashboard/arrangements/`, `lib/arrangement-seeds.ts`,
  two migrations, schema + settings + AppNav edits). Decide whether scaffolding
  and Arrangements ship together or separately before the first `ship`.
- `Ready Handover.zip` is sitting untracked in the repo root — confirm whether it
  should be committed, git-ignored, or removed.
- `node_modules` is present in the working tree mount; ensure `.gitignore` keeps
  it out of commits.

---

## Update protocol

At the end of each working session, update the four fields above:
**Current phase**, **Last action**, **Next action**, **Open threads**. That's the
whole handoff — everything else lives in `PLAN.md` / `RULES.md` / `PARKINGLOT.md`.
