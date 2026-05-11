// app/api/invites/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/userBootstrap'
import { generateToken } from '@/lib/messageHelpers'
import { sendInviteEmail } from '@/lib/email/sendInvite'

/**
 * Invite lifecycle:
 *   created → (optionally) emailed → (token used N times) → revoked or expired
 *
 * A single invite token can be used multiple times (a contributor might
 * record a video AND write a letter as two separate contributions).
 * `useCount` is incremented on each successful submit.
 *
 * Note: no per-plan invite cap or daily abuse limit in 2c.1. The plan is to
 * gate invitees to entries in the Contacts list once Contacts ships (Zip 3).
 * Until then, invite creation is open. See BACKLOG.
 */

const DEFAULT_EXPIRY_DAYS = 30
const MAX_EXPIRY_DAYS = 365

// GET — list this user's invites, newest first.
// Includes contribution counts so the UI can show "3 memories received".
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureUser(userId)

  const invites = await prisma.messageInvite.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      token: true,
      contributorName: true,
      contributorEmail: true,
      message: true,
      expiresAt: true,
      revokedAt: true,
      lastUsedAt: true,
      useCount: true,
      createdAt: true,
      _count: { select: { contributions: true } },
    },
  })

  return NextResponse.json({
    invites: invites.map((inv) => ({
      id: inv.id,
      token: inv.token,
      contributorName: inv.contributorName,
      contributorEmail: inv.contributorEmail,
      message: inv.message,
      expiresAt: inv.expiresAt.toISOString(),
      revokedAt: inv.revokedAt?.toISOString() ?? null,
      lastUsedAt: inv.lastUsedAt?.toISOString() ?? null,
      useCount: inv.useCount,
      contributionCount: inv._count.contributions,
      createdAt: inv.createdAt.toISOString(),
    })),
  })
}

// POST — create a new invite. Body:
//   {
//     contributorName: string         // required, e.g. "Aunt Mary"
//     contributorEmail?: string       // optional; if set + sendEmail=true, we email it
//     message?: string                // optional personal note
//     expiresInDays?: number          // default 30, max 365
//     sendEmail?: boolean             // default false; if true and email set, send via Resend
//   }
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await ensureUser(userId)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const b = (body ?? {}) as Record<string, unknown>
  const contributorName = typeof b.contributorName === 'string' ? b.contributorName.trim() : ''
  const contributorEmail = typeof b.contributorEmail === 'string' ? b.contributorEmail.trim() : ''
  const message = typeof b.message === 'string' ? b.message.trim() : ''
  const expiresInDaysRaw = typeof b.expiresInDays === 'number' ? b.expiresInDays : DEFAULT_EXPIRY_DAYS
  const sendEmail = b.sendEmail === true

  if (!contributorName) {
    return NextResponse.json(
      { error: 'A name is required so you remember who this is for' },
      { status: 400 }
    )
  }

  // Clamp expiry to a sane range
  const expiresInDays = Math.min(
    Math.max(1, Math.round(expiresInDaysRaw)),
    MAX_EXPIRY_DAYS
  )
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  // Validate email if user wants us to send
  if (sendEmail) {
    if (!contributorEmail) {
      return NextResponse.json(
        { error: 'An email address is required to send the invitation' },
        { status: 400 }
      )
    }
    if (!isValidEmail(contributorEmail)) {
      return NextResponse.json(
        { error: 'That email address doesn’t look right' },
        { status: 400 }
      )
    }
  }

  // Create the invite
  const invite = await prisma.messageInvite.create({
    data: {
      userId,
      token: generateToken(),
      contributorName,
      contributorEmail: contributorEmail || null,
      message: message || null,
      expiresAt,
    },
  })

  // Build the contributor URL
  const origin = getOrigin(request)
  const inviteUrl = `${origin}/contribute/${invite.token}`

  // Optionally email the invitee. We do this best-effort — if Resend fails,
  // the invite is still created and the user gets the link to share manually.
  let emailResult: { sent: boolean; skipped?: boolean; error?: string } = { sent: false }
  if (sendEmail && contributorEmail) {
    const inviterName = user.name?.trim() || 'A loved one'
    const result = await sendInviteEmail({
      to: contributorEmail,
      contributorName,
      inviterName,
      personalMessage: message || undefined,
      inviteUrl,
      expiresAt,
    })
    if (result.error) {
      emailResult = { sent: false, error: result.error }
    } else if (result.skipped) {
      emailResult = { sent: false, skipped: true }
    } else {
      emailResult = { sent: true }
    }
  }

  return NextResponse.json({
    invite: {
      id: invite.id,
      token: invite.token,
      contributorName: invite.contributorName,
      contributorEmail: invite.contributorEmail,
      message: invite.message,
      expiresAt: invite.expiresAt.toISOString(),
      revokedAt: null,
      lastUsedAt: null,
      useCount: 0,
      contributionCount: 0,
      createdAt: invite.createdAt.toISOString(),
    },
    inviteUrl,
    email: emailResult,
  })
}

function isValidEmail(email: string): boolean {
  // Loose check — Resend will catch the real problems
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Determine the request origin. In production we use the host header; for
 * dev/preview the same fallback applies. NEXT_PUBLIC_APP_URL is checked
 * first if set — useful when running behind a tunnel where the host header
 * is the internal address.
 */
function getOrigin(request: Request): string {
  const envOrigin = process.env.NEXT_PUBLIC_APP_URL
  if (envOrigin) return envOrigin.replace(/\/$/, '')
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}
