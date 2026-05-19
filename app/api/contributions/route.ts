// app/api/contributions/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/userBootstrap'
import { sendContributionNotificationEmail } from '@/lib/email/sendContributionNotification'

/**
 * Zip 2c.3 hotfix: restores the GET handler that was inadvertently dropped
 * when 2c.3 added trim fields to POST (the file got rebuilt from the 2c.1
 * base, which never had GET). Symptom: the "From others" tab returned 405
 * on every request, the page interpreted the failure as "no contributions
 * exist" and showed the empty state.
 *
 * - GET is Clerk-authed. Returns the signed-in user's contributions,
 *   filterable by ?archived=true|false|all. Default: non-archived only.
 * - POST stays public (token-gated). Accepts the 2c.3 trim fields.
 */

const VALID_TYPES = new Set(['letter', 'video', 'photo', 'story'])
const MAX_CONTENT_LENGTH = 20_000
const MAX_NOTE_LENGTH = 1000

// ───────────────────────────────────────────────────────────
// GET — list the signed-in user's contributions
// ───────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureUser(userId)

  const url = new URL(request.url)
  const archivedParam = url.searchParams.get('archived')
  // Default: only show non-archived. Pass ?archived=true to get archived
  // contributions. Pass ?archived=all to get everything (used by stats).
  const archivedFilter =
    archivedParam === 'true'
      ? { archivedAt: { not: null } }
      : archivedParam === 'all'
        ? {} // no filter
        : { archivedAt: null }

  const contributions = await prisma.contribution.findMany({
    where: {
      userId,
      ...archivedFilter,
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      contributorName: true,
      contributorNote: true,
      content: true,
      mediaUrl: true,
      mediaBlobPath: true,
      mediaDurationSec: true,
      // Zip 2c.3: include trim fields so feed thumbnails / inline previews
      // can also respect playback bounds when they want to.
      mediaTrimStartSec: true,
      mediaTrimEndSec: true,
      viewedByUser: true,
      archivedAt: true,
      importedToTimelineItemId: true,
      createdAt: true,
      invite: {
        select: { id: true, contributorEmail: true },
      },
    },
  })

  return NextResponse.json({
    contributions: contributions.map((c) => ({
      id: c.id,
      type: c.type,
      contributorName: c.contributorName,
      contributorEmail: c.invite.contributorEmail,
      contributorNote: c.contributorNote,
      content: c.content,
      mediaUrl: c.mediaUrl,
      mediaDurationSec: c.mediaDurationSec,
      mediaTrimStartSec: c.mediaTrimStartSec,
      mediaTrimEndSec: c.mediaTrimEndSec,
      viewedByUser: c.viewedByUser,
      archivedAt: c.archivedAt?.toISOString() ?? null,
      importedToTimelineItemId: c.importedToTimelineItemId,
      createdAt: c.createdAt.toISOString(),
    })),
  })
}

// ───────────────────────────────────────────────────────────
// POST — public submit (token-gated; no Clerk session)
// ───────────────────────────────────────────────────────────
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const b = (body ?? {}) as Record<string, unknown>
  const token = typeof b.token === 'string' ? b.token.trim() : ''
  const type = typeof b.type === 'string' ? b.type : ''
  const content = typeof b.content === 'string' ? b.content : null
  const mediaUrl = typeof b.mediaUrl === 'string' ? b.mediaUrl : null
  const mediaBlobPath = typeof b.mediaBlobPath === 'string' ? b.mediaBlobPath : null
  const mediaDurationSec =
    typeof b.mediaDurationSec === 'number' ? Math.round(b.mediaDurationSec) : null
  // Zip 2c.3: trim handles for video playback. Null = no trim from that side.
  const mediaTrimStartSec =
    typeof b.mediaTrimStartSec === 'number' && b.mediaTrimStartSec >= 0
      ? Math.round(b.mediaTrimStartSec)
      : null
  const mediaTrimEndSec =
    typeof b.mediaTrimEndSec === 'number' && b.mediaTrimEndSec >= 0
      ? Math.round(b.mediaTrimEndSec)
      : null
  const contributorNote = typeof b.contributorNote === 'string' ? b.contributorNote.trim() : ''

  if (!token) {
    return NextResponse.json({ error: 'Missing invitation token' }, { status: 400 })
  }
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: 'Unrecognized contribution type' }, { status: 400 })
  }

  if (type === 'letter' || type === 'story') {
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: type === 'letter' ? 'A letter needs some text' : 'A story needs some text' },
        { status: 400 }
      )
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `That’s a long one — please keep it under ${MAX_CONTENT_LENGTH.toLocaleString()} characters` },
        { status: 400 }
      )
    }
  }
  if (type === 'video' || type === 'photo') {
    if (!mediaUrl || !mediaBlobPath) {
      return NextResponse.json(
        { error: 'Media upload did not complete — please try again' },
        { status: 400 }
      )
    }
  }
  if (contributorNote.length > MAX_NOTE_LENGTH) {
    return NextResponse.json(
      { error: `Note is too long — please keep it under ${MAX_NOTE_LENGTH} characters` },
      { status: 400 }
    )
  }

  const invite = await prisma.messageInvite.findUnique({
    where: { token },
    select: {
      id: true,
      userId: true,
      contributorName: true,
      revokedAt: true,
      expiresAt: true,
    },
  })
  if (!invite) {
    return NextResponse.json({ error: 'This invitation is no longer valid' }, { status: 404 })
  }
  if (invite.revokedAt) {
    return NextResponse.json({ error: 'This invitation has been revoked' }, { status: 410 })
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 })
  }

  const [contribution] = await prisma.$transaction([
    prisma.contribution.create({
      data: {
        userId: invite.userId,
        inviteId: invite.id,
        contributorName: invite.contributorName,
        contributorNote: contributorNote || null,
        type,
        content: type === 'letter' || type === 'story' ? content : null,
        mediaUrl: type === 'video' || type === 'photo' ? mediaUrl : null,
        mediaBlobPath: type === 'video' || type === 'photo' ? mediaBlobPath : null,
        mediaDurationSec: type === 'video' ? mediaDurationSec : null,
        mediaTrimStartSec: type === 'video' ? mediaTrimStartSec : null,
        mediaTrimEndSec: type === 'video' ? mediaTrimEndSec : null,
      },
    }),
    prisma.messageInvite.update({
      where: { id: invite.id },
      data: {
        useCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    }),
  ])

  // Zip 2c.6: send a notification email to the owner. Best-effort —
  // failures here must NOT bubble back to the contributor (their
  // submission already succeeded; they shouldn't see a 500 because
  // the owner's email provider hiccuped).
  //
  // Dedupe: only send if no prior contribution FROM THIS SAME INVITE
  // was emailed within the last 15 minutes. We check by invite, not by
  // contributor name, because invite is the stable identity here —
  // contributor name is whatever the inviter typed and could collide.
  //
  // Honored toggle: Settings.notifyOnContribution. Default true; if the
  // user has no Settings row yet, default applies.
  void (async () => {
    try {
      const [settings, owner, recent] = await Promise.all([
        prisma.settings.findUnique({
          where: { userId: invite.userId },
          select: { notifyOnContribution: true },
        }),
        prisma.user.findUnique({
          where: { id: invite.userId },
          select: { email: true, name: true },
        }),
        prisma.contribution.findFirst({
          where: {
            inviteId: invite.id,
            notifyEmailedAt: { not: null },
            id: { not: contribution.id },
          },
          orderBy: { notifyEmailedAt: 'desc' },
          select: { notifyEmailedAt: true },
        }),
      ])

      // Default-on: undefined settings row = treat as enabled
      const notifyEnabled = settings?.notifyOnContribution ?? true
      if (!notifyEnabled) return
      if (!owner?.email) return

      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000)
      if (recent?.notifyEmailedAt && recent.notifyEmailedAt > fifteenMinAgo) {
        // Within dedupe window — don't email, don't mark this one as sent
        return
      }

      // Build preview based on type. Letters/stories: first ~30 words.
      // Videos/photos: literal line (matches messageDelivery convention).
      const preview = (() => {
        if (type === 'letter' || type === 'story') {
          const text = (content ?? '').split(/\s+/).slice(0, 30).join(' ')
          return text || undefined
        }
        return undefined
      })()

      const base =
        process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.readywithlove.com'

      await sendContributionNotificationEmail({
        to: owner.email,
        recipientName: owner.name ?? 'there',
        contributorName: invite.contributorName,
        contributionType: type as 'letter' | 'video' | 'photo' | 'story',
        contributionPreview: preview,
        dashboardUrl: `${base}/dashboard/contributions`,
      })

      // Mark this contribution as the one that triggered the email so
      // the 15-min window starts now.
      await prisma.contribution.update({
        where: { id: contribution.id },
        data: { notifyEmailedAt: new Date() },
      })
    } catch (err) {
      // Swallow — the contribution itself succeeded; this is just
      // bookkeeping for the owner. Log for visibility.
      console.error('contribution notification email failed:', err)
    }
  })()

  return NextResponse.json({
    ok: true,
    contributionId: contribution.id,
  })
}
