// app/api/contributions/by-token/[token]/[contributionId]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteBlob } from '@/lib/blob'
import { computeLockStatus, describeLockReason } from '@/lib/contributionLock'

/**
 * Public-by-token routes for a single contribution. Authenticated by the
 * token belonging to the same invite the contribution was made under.
 *
 * GET    — read (any time, even after lock)
 * PATCH  — edit content / contributorNote / media (only while unlocked)
 * DELETE — remove the contribution + its blob (only while unlocked)
 *
 * Lock policy is enforced server-side via computeLockStatus. The client
 * may show or hide buttons based on its own (cached) lock status, but
 * the server is the source of truth — a stale client trying to PATCH a
 * just-viewed contribution will get a 423 LOCKED response.
 *
 * Media replacement: PATCH accepts new mediaUrl + mediaBlobPath (set by the
 * contributor's client after a fresh upload to the dedicated upload-url
 * endpoint). When media is replaced, the OLD blob is deleted to avoid
 * orphans. Same row, new media — no contribution row turnover.
 */

const MAX_CONTENT_LENGTH = 20_000
const MAX_NOTE_LENGTH = 1000

// ───────────────────────────────────────────────────────────
// Shared: load + validate ownership-by-token
// ───────────────────────────────────────────────────────────
async function loadContribution(token: string, contributionId: string) {
  if (!token || !contributionId) return null

  const invite = await prisma.messageInvite.findUnique({
    where: { token },
    select: { id: true },
  })
  if (!invite) return null

  const contribution = await prisma.contribution.findUnique({
    where: { id: contributionId },
    select: {
      id: true,
      inviteId: true,
      type: true,
      content: true,
      mediaUrl: true,
      mediaBlobPath: true,
      mediaDurationSec: true,
      mediaTrimStartSec: true,
      mediaTrimEndSec: true,
      contributorNote: true,
      viewedByUser: true,
      createdAt: true,
    },
  })
  if (!contribution || contribution.inviteId !== invite.id) return null
  return contribution
}

// ───────────────────────────────────────────────────────────
// GET
// ───────────────────────────────────────────────────────────
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; contributionId: string }> }
) {
  const { token, contributionId } = await params
  const c = await loadContribution(token, contributionId)
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const lock = computeLockStatus(c.createdAt, c.viewedByUser)
  return NextResponse.json({
    id: c.id,
    type: c.type,
    content: c.content,
    mediaUrl: c.mediaUrl,
    mediaDurationSec: c.mediaDurationSec,
    mediaTrimStartSec: c.mediaTrimStartSec,
    mediaTrimEndSec: c.mediaTrimEndSec,
    contributorNote: c.contributorNote,
    viewedByUser: c.viewedByUser,
    createdAt: c.createdAt.toISOString(),
    locked: lock.locked,
    lockReason: lock.reason,
    msRemaining: lock.msRemaining,
  })
}

// ───────────────────────────────────────────────────────────
// PATCH — edit content/note/media (lock-gated)
// ───────────────────────────────────────────────────────────
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string; contributionId: string }> }
) {
  const { token, contributionId } = await params
  const c = await loadContribution(token, contributionId)
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const lock = computeLockStatus(c.createdAt, c.viewedByUser)
  if (lock.locked) {
    return NextResponse.json(
      {
        error: describeLockReason(lock.reason),
        locked: true,
        lockReason: lock.reason,
      },
      { status: 423 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const b = (body ?? {}) as Record<string, unknown>

  const data: {
    content?: string | null
    contributorNote?: string | null
    mediaUrl?: string
    mediaBlobPath?: string
    mediaDurationSec?: number | null
    mediaTrimStartSec?: number | null
    mediaTrimEndSec?: number | null
  } = {}
  let oldBlobToDelete: string | null = null

  // ── content (letter/story only)
  if (b.content !== undefined) {
    if (c.type !== 'letter' && c.type !== 'story') {
      return NextResponse.json(
        { error: 'Content can only be edited on letter or story contributions' },
        { status: 400 }
      )
    }
    if (typeof b.content !== 'string' || !b.content.trim()) {
      return NextResponse.json(
        { error: 'Content cannot be empty' },
        { status: 400 }
      )
    }
    if (b.content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `Please keep it under ${MAX_CONTENT_LENGTH.toLocaleString()} characters` },
        { status: 400 }
      )
    }
    data.content = b.content
  }

  // ── contributorNote (any type)
  if (b.contributorNote !== undefined) {
    if (b.contributorNote === null || b.contributorNote === '') {
      data.contributorNote = null
    } else if (typeof b.contributorNote === 'string') {
      if (b.contributorNote.length > MAX_NOTE_LENGTH) {
        return NextResponse.json(
          { error: `Please keep your note under ${MAX_NOTE_LENGTH} characters` },
          { status: 400 }
        )
      }
      data.contributorNote = b.contributorNote.trim() || null
    }
  }

  // ── media replacement (video/photo only)
  if (b.mediaUrl !== undefined || b.mediaBlobPath !== undefined) {
    if (c.type !== 'video' && c.type !== 'photo') {
      return NextResponse.json(
        { error: 'Media can only be replaced on video or photo contributions' },
        { status: 400 }
      )
    }
    if (typeof b.mediaUrl !== 'string' || typeof b.mediaBlobPath !== 'string') {
      return NextResponse.json(
        { error: 'Both mediaUrl and mediaBlobPath are required when replacing media' },
        { status: 400 }
      )
    }
    data.mediaUrl = b.mediaUrl
    data.mediaBlobPath = b.mediaBlobPath
    if (c.mediaUrl && c.mediaUrl !== b.mediaUrl) {
      oldBlobToDelete = c.mediaUrl
    }
    if (c.type === 'video') {
      if (typeof b.mediaDurationSec === 'number' && b.mediaDurationSec >= 0) {
        data.mediaDurationSec = Math.round(b.mediaDurationSec)
      }
      // Replacing media also resets trim by default — the new clip has
      // different timing. The client is allowed to send fresh trim values
      // in the same PATCH (e.g., contributor records a new video AND sets
      // trim before saving), in which case those win (handled below).
      // Default null clears any prior trim.
      data.mediaTrimStartSec = null
      data.mediaTrimEndSec = null
    }
  }

  // ── trim fields (video only). May come alongside a media replacement
  // (overriding the default null we set above) or standalone (e.g., the
  // contributor wants to trim an existing clip without re-uploading).
  if (b.mediaTrimStartSec !== undefined || b.mediaTrimEndSec !== undefined) {
    if (c.type !== 'video') {
      return NextResponse.json(
        { error: 'Trim only applies to video contributions' },
        { status: 400 }
      )
    }
    for (const field of ['mediaTrimStartSec', 'mediaTrimEndSec'] as const) {
      if (b[field] !== undefined) {
        if (b[field] === null) {
          data[field] = null
        } else {
          const n = Number(b[field])
          if (!Number.isFinite(n) || n < 0) {
            return NextResponse.json(
              { error: `Invalid ${field}` },
              { status: 400 }
            )
          }
          data[field] = Math.round(n)
        }
      }
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const updated = await prisma.contribution.update({
    where: { id: c.id },
    data,
    select: {
      id: true,
      content: true,
      mediaUrl: true,
      mediaDurationSec: true,
      mediaTrimStartSec: true,
      mediaTrimEndSec: true,
      contributorNote: true,
      viewedByUser: true,
      createdAt: true,
    },
  })

  // Clean up the old blob AFTER the DB update succeeds. If this fails we
  // log and move on — the user-facing operation is the row update, not the
  // storage cleanup. Orphaned blobs are recoverable; failed edits are not.
  if (oldBlobToDelete) {
    await deleteBlob(oldBlobToDelete)
  }

  const newLock = computeLockStatus(updated.createdAt, updated.viewedByUser)
  return NextResponse.json({
    id: updated.id,
    content: updated.content,
    mediaUrl: updated.mediaUrl,
    mediaDurationSec: updated.mediaDurationSec,
    mediaTrimStartSec: updated.mediaTrimStartSec,
    mediaTrimEndSec: updated.mediaTrimEndSec,
    contributorNote: updated.contributorNote,
    locked: newLock.locked,
    lockReason: newLock.reason,
    msRemaining: newLock.msRemaining,
  })
}

// ───────────────────────────────────────────────────────────
// DELETE — remove contribution + media blob (lock-gated)
// ───────────────────────────────────────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ token: string; contributionId: string }> }
) {
  const { token, contributionId } = await params
  const c = await loadContribution(token, contributionId)
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const lock = computeLockStatus(c.createdAt, c.viewedByUser)
  if (lock.locked) {
    return NextResponse.json(
      {
        error: describeLockReason(lock.reason),
        locked: true,
        lockReason: lock.reason,
      },
      { status: 423 }
    )
  }

  // Delete row first, then blob. If blob delete fails, we've still removed
  // the user-visible record; the blob becomes an orphan recoverable via
  // Vercel dashboard. Better than the reverse (delete blob → DB fails →
  // contribution row references a dead URL).
  await prisma.contribution.delete({ where: { id: c.id } })

  if (c.mediaUrl) {
    await deleteBlob(c.mediaUrl)
  }

  // Decrement the invite's useCount so the count stays accurate. We don't
  // bother with lastUsedAt since it's an informational field for the owner.
  await prisma.messageInvite.update({
    where: { id: c.inviteId },
    data: { useCount: { decrement: 1 } },
  })

  return NextResponse.json({ ok: true })
}
