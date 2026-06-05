# ReadyWithLove · Rules

How we work on this project. Read this first in every new chat. This is a living
file — when we discover a preference or a mistake, it gets written here so we
don't relearn it.

---

## Workflow (the loop)

1. **Pick the smallest shippable chunk** from `PLAN.md`.
2. **Build it.**
3. **Confirm locally** — `npm run dev`, click through by hand.
4. **Verify** (recommended) — `npm run verify` (lint + production build) to catch
   type/build errors before they hit Vercel.
5. **Ship** — `npm run ship "phase X: summary"` → pushes to `main` → Vercel deploys.
6. **Confirm live** on the Vercel production URL before starting the next chunk.
7. **Update `HANDOFF.md`** (current phase / last action / next action / open threads).

One chunk = one push, where reasonable. Frequent small pushes over big batches.

---

## This project is special: Next.js is non-standard

`AGENTS.md` warns that this Next.js version has **breaking changes** vs. training
data. **Read the relevant guide in `node_modules/next/dist/docs/` before writing
Next.js code.** Don't assume App Router / API conventions from memory.

---

## Do

- Keep changes scoped to the current chunk; don't refactor unrelated code mid-task.
- Run `npm run verify` before shipping anything non-trivial.
- Confirm on the **live** site, not just localhost, before moving on.
- Reuse existing models/components before adding new ones (the schema already has
  `Contact`, `VaultItem`, `Executor`, etc. ready to wire up).
- Put new ideas in `PARKINGLOT.md` instead of derailing the current chunk.
- Match the existing code style and the app's warm, plain-language tone.
- Treat this as sensitive software — it handles people's final messages and
  post-death data. Correctness and privacy over speed.

## Don't

- Don't commit `node_modules`, `.env*`, secrets, or `Ready Handover.zip` (confirm
  intent before committing any stray archive/binary).
- Don't push straight to production without a local confirm first.
- Don't work on a branch other than `main` without saying so (the ship script
  blocks non-main pushes).
- Don't expand scope silently — surface it, park it, keep moving.
- Don't write Next.js code from memory (see "non-standard" note above).
- Don't run destructive DB/migration commands against production data.

---

## Learned preferences (likes / dislikes)

Grows over time. Add a dated line when we learn something.

- 2026-06-03 — Chunk work as **phases/milestones** (not the old "Zip" numbering).
- 2026-06-03 — **Features working first, then fine-tune/tweaks.**
- 2026-06-03 — Workflow is **confirm local → push → Vercel → confirm live** at each milestone.
- 2026-06-03 — Use **npm scripts** for tooling (`verify`, `ship`), not loose shell scripts.
- 2026-06-03 — Communication style: **concise and direct**; trim words that don't add meaning.

---

## Conventions

- **Commit messages:** `phase X: short imperative summary` (e.g. `phase 1: wire arrangements CRUD`).
- **Migrations:** descriptive folder names; confirm `prisma migrate` state is clean before shipping schema changes.
- **Docs of record:** `PLAN.md` (roadmap), `HANDOFF.md` (state), `RULES.md` (this), `PARKINGLOT.md` (ideas), `BACKLOG.md` (legacy deferred list).
