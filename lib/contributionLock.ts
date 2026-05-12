// lib/contributionLock.ts

/**
 * Edit/delete window for contributions made by contributors via invite link.
 *
 * Policy (Zip 2c.2.1):
 *   A contribution is editable/deletable BY THE CONTRIBUTOR for as long as
 *   BOTH conditions hold:
 *     1. Less than 24 hours have passed since createdAt
 *     2. The owner has not yet viewed it (viewedByUser === false)
 *
 *   Once either condition flips, the contribution is locked. Locking is
 *   one-way — there's no path back from "viewed" to "editable" even if the
 *   owner subsequently unviewed it (which we don't expose anyway).
 *
 * This module is the SOLE source of truth for that policy. Routes and the
 * thanks-page UI all import from here. If the policy ever changes (longer
 * window? grace period after view?), changing it here updates everywhere.
 */

export const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

export type LockReason = 'viewed' | 'expired' | null

export interface LockStatus {
  /** True when the contributor can no longer edit/delete. */
  locked: boolean
  /** Why it's locked — for UX messaging. Null when unlocked. */
  reason: LockReason
  /** Milliseconds remaining in the edit window. Negative or 0 when expired. */
  msRemaining: number
}

/**
 * Compute lock status from the raw fields. Works on both server (DB row)
 * and client (deserialized JSON) since it only touches primitives.
 */
export function computeLockStatus(
  createdAt: Date | string,
  viewedByUser: boolean,
  now: Date = new Date()
): LockStatus {
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt)
  const elapsed = now.getTime() - created.getTime()
  const msRemaining = EDIT_WINDOW_MS - elapsed

  if (viewedByUser) {
    return { locked: true, reason: 'viewed', msRemaining }
  }
  if (msRemaining <= 0) {
    return { locked: true, reason: 'expired', msRemaining: 0 }
  }
  return { locked: false, reason: null, msRemaining }
}

/**
 * Human-friendly explanation of the lock reason. Used on the thanks page
 * and the detail view to explain WHY a card can't be edited.
 */
export function describeLockReason(reason: LockReason): string {
  if (reason === 'viewed') return 'Already viewed by the recipient'
  if (reason === 'expired') return 'Edit window (24 hours) has closed'
  return ''
}

/**
 * Format the remaining edit window as "Xh Ym left" or "Xm left".
 * Used for the live countdown on the thanks page.
 */
export function formatTimeRemaining(msRemaining: number): string {
  if (msRemaining <= 0) return 'expired'
  const totalMinutes = Math.floor(msRemaining / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}h ${minutes}m left`
  if (minutes > 0) return `${minutes}m left`
  // Under a minute — show seconds for the final stretch
  const seconds = Math.max(0, Math.floor(msRemaining / 1000))
  return `${seconds}s left`
}
