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

// Message types — expanded in Zip 2c.2.2 to match the four contribution
// types. Letters and stories share storage shape (both use `content`),
// videos and photos both use mediaUrl/mediaBlobPath. The only schema
// difference is mediaDurationSec applies only to video.
export const MESSAGE_TYPES = ['letter', 'video', 'photo', 'story'] as const
export type MessageType = (typeof MESSAGE_TYPES)[number]

export const TYPE_LABELS: Record<MessageType, { label: string; article: string; icon: string }> = {
  letter: { label: 'Letter', article: 'A letter',       icon: '✎' },
  video:  { label: 'Video',  article: 'A video message', icon: '●' },
  photo:  { label: 'Photo',  article: 'A photo',         icon: '◇' },
  story:  { label: 'Story',  article: 'A story',         icon: '❦' },
}

/**
 * Whether a message type uses text content (letter, story) vs media (video, photo).
 * Used in validation: text types require non-empty `content`; media types
 * require non-empty `mediaUrl`.
 */
export function isTextType(type: MessageType | string): type is 'letter' | 'story' {
  return type === 'letter' || type === 'story'
}
export function isMediaType(type: MessageType | string): type is 'video' | 'photo' {
  return type === 'video' || type === 'photo'
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
