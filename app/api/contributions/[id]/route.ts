// app/api/contributions/[id]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/userBootstrap'
import { deleteBlob } from '@/lib/blob'

/**
 * GET — fetch one contribution. Side effect: marks viewedByUser=true so the
 *       unread dot in the nav clears once the user actually opens it.
 *
 * PATCH — body can include:
 *   - archive: true | false       → set/clear archivedAt
 *   - importedToTimelineItemId: string | null
 *
 * DELETE — Zip 2c.4: hard-delete the contribution. Removes the row, deletes
 *   the blob if present, decrements the invite useCount. Unlike the
 *   contributor's 24h edit window, the OWNER can delete at any time —
 *   it's their shoebox.
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
        select: { id: true, contributorEmail: true, message: true, revokedAt: true },
      },
    },
  })

  if (!contribution || contribution.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!contribution.viewedByUser) {
    await prisma.contribution.update({
      where: { id },
      data: { viewedByUser: true },
    })
  }

  // Zip 2c.4: if this contribution was imported to a timeline item,
  // fetch that item's date so the UI can show "✓ Added to 1975".
  let importedToTimelineDate: string | null = null
  if (contribution.importedToTimelineItemId) {
    const item = await prisma.timelineItem.findUnique({
      where: { id: contribution.importedToTimelineItemId },
      select: { date: true },
    })
    if (item) importedToTimelineDate = item.date.toISOString()
  }

  return NextResponse.json({
    id: contribution.id,
    type: contribution.type,
    contributorName: contribution.contributorName,
    contributorEmail: contribution.invite.contributorEmail,
    contributorNote: contribution.contributorNote,
    inviteMessage: contribution.invite.message,
    inviteId: contribution.invite.id,
    inviteRevokedAt: contribution.invite.revokedAt?.toISOString() ?? null,
    content: contribution.content,
    mediaUrl: contribution.mediaUrl,
    mediaDurationSec: contribution.mediaDurationSec,
    mediaTrimStartSec: contribution.mediaTrimStartSec,
    mediaTrimEndSec: contribution.mediaTrimEndSec,
    viewedByUser: true,
    archivedAt: contribution.archivedAt?.toISOString() ?? null,
    importedToTimelineItemId: contribution.importedToTimelineItemId,
    importedToTimelineDate,
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureUser(userId)

  const { id } = await params

  const existing = await prisma.contribution.findUnique({
    where: { id },
    select: { id: true, userId: true, mediaUrl: true, inviteId: true },
  })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Delete row first so a blob-delete failure doesn't leave a dangling
  // record pointing at a deleted blob. The blob becomes an orphan on
  // failure, which is recoverable via the Vercel dashboard — worse
  // outcome would be a DB row pointing at a 404.
  await prisma.contribution.delete({ where: { id } })

  if (existing.mediaUrl) {
    try {
      await deleteBlob(existing.mediaUrl)
    } catch (err) {
      console.error('[contribution DELETE] blob delete failed:', err)
      // Don't fail the request — the contribution is gone from the user's
      // perspective. The orphaned blob can be cleaned up later.
    }
  }

  // Decrement the invite's useCount so the displayed count stays accurate
  await prisma.messageInvite.update({
    where: { id: existing.inviteId },
    data: { useCount: { decrement: 1 } },
  })

  return NextResponse.json({ ok: true })
}
