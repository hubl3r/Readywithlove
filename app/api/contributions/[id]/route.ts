// app/api/contributions/[id]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/userBootstrap'

/**
 * GET — fetch one contribution. Side effect: marks viewedByUser=true so the
 *       unread dot in the nav clears once the user actually opens it.
 *       (We could move this to a separate "mark viewed" call but the GET is
 *       always immediately tied to viewing, so this is fine.)
 *
 * PATCH — body can include:
 *   - archive: true | false       → set/clear archivedAt
 *   - importedToTimelineItemId: string | null
 *     (normally set by the Timeline POST when fromContributionId is passed;
 *     exposed here for manual override / future-proofing)
 *
 * No DELETE. Per product decision (Zip 2c.2): contributions are gifts;
 * once received, they can be archived but not destroyed.
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureUser(userId)

  const { id } = await params

  const contribution = await prisma.contribution.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
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
        select: { id: true, contributorEmail: true, message: true },
      },
    },
  })

  if (!contribution || contribution.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Mark viewed on first GET. Cheap enough to do every time (no-op when
  // already true thanks to Prisma's diff-based update), but we skip the
  // write when already true to avoid burning a connection.
  if (!contribution.viewedByUser) {
    await prisma.contribution.update({
      where: { id },
      data: { viewedByUser: true },
    })
  }

  return NextResponse.json({
    id: contribution.id,
    type: contribution.type,
    contributorName: contribution.contributorName,
    contributorEmail: contribution.invite.contributorEmail,
    contributorNote: contribution.contributorNote,
    inviteMessage: contribution.invite.message,
    content: contribution.content,
    mediaUrl: contribution.mediaUrl,
    mediaDurationSec: contribution.mediaDurationSec,
    mediaTrimStartSec: contribution.mediaTrimStartSec,
    mediaTrimEndSec: contribution.mediaTrimEndSec,
    viewedByUser: true, // we just set it
    archivedAt: contribution.archivedAt?.toISOString() ?? null,
    importedToTimelineItemId: contribution.importedToTimelineItemId,
    createdAt: contribution.createdAt.toISOString(),
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureUser(userId)

  const { id } = await params

  const existing = await prisma.contribution.findUnique({
    where: { id },
    select: { id: true, userId: true, archivedAt: true },
  })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const b = (body ?? {}) as Record<string, unknown>
  const data: { archivedAt?: Date | null; importedToTimelineItemId?: string | null } = {}

  if (typeof b.archive === 'boolean') {
    data.archivedAt = b.archive ? new Date() : null
  }
  if (b.importedToTimelineItemId !== undefined) {
    if (b.importedToTimelineItemId === null) {
      data.importedToTimelineItemId = null
    } else if (typeof b.importedToTimelineItemId === 'string') {
      data.importedToTimelineItemId = b.importedToTimelineItemId
    } else {
      return NextResponse.json({ error: 'Invalid importedToTimelineItemId' }, { status: 400 })
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const updated = await prisma.contribution.update({
    where: { id },
    data,
    select: {
      id: true,
      archivedAt: true,
      importedToTimelineItemId: true,
    },
  })

  return NextResponse.json({
    id: updated.id,
    archivedAt: updated.archivedAt?.toISOString() ?? null,
    importedToTimelineItemId: updated.importedToTimelineItemId,
  })
}
