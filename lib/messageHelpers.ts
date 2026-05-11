// lib/messageHelpers.ts
import crypto from 'crypto'

// Message states. Keep in sync with prisma schema doc-comment + UI labels.
export const MESSAGE_STATES = [
  'drafting',
  'scheduled',
  'pending_approval',
  'sent',
  'archived',
] as const

export type MessageState = (typeof MESSAGE_STATES)[number]

// User-facing label and color hint for each state.
export const STATE_LABELS: Record<MessageState, { label: string; tone: 'neutral' | 'warm' | 'success' | 'danger' }> = {
  drafting:         { label: 'Drafting',         tone: 'neutral' },
  scheduled:        { label: 'Scheduled',        tone: 'warm' },
  pending_approval: { label: 'Awaiting your ok', tone: 'danger' },
  sent:             { label: 'Delivered',        tone: 'success' },
  archived:         { label: 'Archived',         tone: 'neutral' },
}

/**
 * Generate a URL-safe random token for delivery and approval links.
 * 32 bytes of randomness, base64url-encoded (no padding) — about 43 chars.
 * That's well past the unguessability threshold (~256 bits of entropy).
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/**
 * The approval window — how long after a trigger date elapses (with user alive)
 * we keep reminding before auto-delivering (silence-implies-approve per Adam's
 * direction; coma case).
 */
export const APPROVAL_WINDOW_DAYS = 14

/**
 * The 14-day approval window expires at this Date given a prompt date.
 */
export function approvalExpiryFrom(promptedAt: Date): Date {
  const d = new Date(promptedAt)
  d.setDate(d.getDate() + APPROVAL_WINDOW_DAYS)
  return d
}
