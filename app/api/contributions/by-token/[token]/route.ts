// app/api/contributions/by-token/[token]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeLockStatus } from '@/lib/contributionLock'

/**
 * PUBLIC list of contributions made via a given invite token.
 *
 * No Clerk auth — the token IS the auth (same model as the submit and
 * upload-url endpoints). The token only exposes contributions for THIS
 * invite, not others by the same recipient/contributor.
 *
 * Used by:
 *   - /contribute/[token]/thanks → shows the contributor everything they've
 *     sent so they can review or, while still in the edit window, edit.
 *
 * Validates: token exists. Doesn't 404 on revoked/expired invites — past
 * contributions are still viewable to the contributor even if the invite
 * is no longer accepting new submissions. (Lock status independently
 * prevents edits after the per-contribution window.)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const invite = await prisma.messageInvite.findUnique({
    where: { token },
    select: {
      id: true,
      contributorName: true,
      revokedAt: true,
      expiresAt: true,
      user: { select: { name: true } },
    },
  })
  if (!invite) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  const contributions = await prisma.contribution.findMany({
    where: { inviteId: invite.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      content: true,
      mediaUrl: true,
      mediaDurationSec: true,
      contributorNote: true,
      viewedByUser: true,
      createdAt: true,
    },
  })

  const now = new Date()
  return NextResponse.json({
    invite: {
      contributorName: invite.contributorName,
      inviterName: invite.user.name?.trim() || 'A loved one',
      revoked: !!invite.revokedAt,
      expired: invite.expiresAt < now,
    },
    contributions: contributions.map((c) => {
      const lock = computeLockStatus(c.createdAt, c.viewedByUser, now)
      return {
        id: c.id,
        type: c.type,
        content: c.content,
        mediaUrl: c.mediaUrl,
        mediaDurationSec: c.mediaDurationSec,
        contributorNote: c.contributorNote,
        viewedByUser: c.viewedByUser,
        createdAt: c.createdAt.toISOString(),
        locked: lock.locked,
        lockReason: lock.reason,
        msRemaining: lock.msRemaining,
      }
    }),
  })
}
