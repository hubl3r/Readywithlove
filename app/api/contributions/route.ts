// app/api/contributions/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Public POST — no auth required. The invite token IS the auth.
 *
 * Body:
 *   {
 *     token: string                  // the MessageInvite token
 *     type: 'letter'|'video'|'photo'|'story'
 *     content?: string               // for letter/story
 *     mediaUrl?: string              // for video/photo — set by upload flow
 *     mediaBlobPath?: string         // for video/photo
 *     mediaDurationSec?: number      // for video
 *     contributorNote?: string       // optional note attached to this contribution
 *   }
 *
 * Validates the token is active (not revoked, not expired), then creates a
 * Contribution row. Increments the invite's useCount and lastUsedAt.
 *
 * One token can produce multiple contributions (a contributor might leave
 * a letter AND a video). The contributor's name comes from the invite — we
 * don't ask them to type it again.
 */

const VALID_TYPES = new Set(['letter', 'video', 'photo', 'story'])
const MAX_CONTENT_LENGTH = 20_000 // characters
const MAX_NOTE_LENGTH = 1000

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
  const mediaDurationSec = typeof b.mediaDurationSec === 'number' ? Math.round(b.mediaDurationSec) : null
  const contributorNote = typeof b.contributorNote === 'string' ? b.contributorNote.trim() : ''

  if (!token) {
    return NextResponse.json({ error: 'Missing invitation token' }, { status: 400 })
  }
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: 'Unrecognized contribution type' }, { status: 400 })
  }

  // Validate by type
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

  // Validate the invite
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

  // Create the contribution and bump the invite atomically
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
