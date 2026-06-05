#!/usr/bin/env node
/**
 * ship.mjs — commit current work and push to GitHub (origin/main).
 *
 * Pushing to main triggers a Vercel production deploy automatically.
 *
 * Usage:
 *   npm run ship "your commit message"
 *   npm run ship -- --verify "your commit message"   # run lint+build first
 *
 * Workflow reminder (see RULES.md):
 *   1. npm run dev      -> confirm it works locally
 *   2. npm run verify   -> lint + production build (optional but recommended)
 *   3. npm run ship "…" -> commit + push -> Vercel deploys
 *   4. confirm on the live site before starting the next milestone
 */

import { execSync } from "node:child_process";

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: "pipe", encoding: "utf8", ...opts }).trim();
}

function runLive(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

const args = process.argv.slice(2);
const verify = args.includes("--verify");
const message = args.filter((a) => a !== "--verify").join(" ").trim();

if (!message) {
  console.error('\n✗ Commit message required.\n  Usage: npm run ship "what changed"\n');
  process.exit(1);
}

// Must be on main (we deploy from main).
const branch = run("git rev-parse --abbrev-ref HEAD");
if (branch !== "main") {
  console.error(`\n✗ You are on "${branch}", not main. Switch to main before shipping.\n`);
  process.exit(1);
}

// Anything to commit?
const status = run("git status --porcelain");
if (!status) {
  console.error("\n✗ Nothing to commit — working tree is clean.\n");
  process.exit(1);
}

if (verify) {
  console.log("\n▶ Running verify (lint + build)…\n");
  runLive("npm run verify");
}

console.log("\n▶ Staging, committing, pushing…\n");
runLive("git add -A");
runLive(`git commit -m ${JSON.stringify(message)}`);
runLive("git push origin main");

console.log("\n✓ Pushed to origin/main. Vercel will deploy this commit.");
console.log("  → Confirm on the live site before the next milestone.\n");
