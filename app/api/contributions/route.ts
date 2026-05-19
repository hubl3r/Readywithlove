// app/api/contributions/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/userBootstrap'

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

  // Zip 2c.4: batch-fetch the dates of imported timeline items so cards
  // can show "✓ Added to 1975". One round-trip for all of them; safer
  // than N+1 from the map.
  const importedIds = contributions
    .map((c) => c.importedToTimelineItemId)
    .filter((id): id is string => !!id)
  const importedDates = new Map<string, Date>()
  if (importedIds.length > 0) {
    const items = await prisma.timelineItem.findMany({
      where: { id: { in: importedIds } },
      select: { id: true, date: true },
    })
    for (const item of items) importedDates.set(item.id, item.date)
  }

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
      importedToTimelineDate: c.importedToTimelineItemId
        ? (importedDates.get(c.importedToTimelineItemId)?.toISOString() ?? null)
        : null,
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

  return NextResponse.json({
    ok: true,
    contributionId: contribution.id,
  })
}
