// app/api/messages/[id]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteBlob } from '@/lib/blob'
import {
  MESSAGE_STATES,
  MESSAGE_TYPES,
  isTextType,
  isMediaType,
  type MessageState,
  type MessageType,
} from '@/lib/messageHelpers'

const EDITABLE_FIELDS = [
  'recipientName',
  'recipientEmail',
  'subject',
  'content',
  'type',
  'triggerDate',
] as const

// States from which the user is allowed to hard-delete a message.
// Anything that's been sent or has been queued for delivery should only
// be archivable, not destroyable.
const DELETABLE_STATES: ReadonlySet<MessageState> = new Set([
  'drafting',
])

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const message = await prisma.message.findUnique({ where: { id } })
  if (!message || message.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(message)
}

// PATCH — update editable fields. Some fields (state, tokens) are managed by
// dedicated routes (/approve, /archive, etc.).
//
// Zip 2c.2.2: type field now accepts any of the 4 message types. Validation
// for 'scheduled' state transition checks per-type requirements.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.message.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (existing.state === 'sent') {
    return NextResponse.json({ error: 'Cannot edit a sent message' }, { status: 400 })
  }

  const body = await request.json()
  const data: Record<string, unknown> = {}
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) data[field] = body[field]
  }
  if (data.triggerDate && typeof data.triggerDate === 'string') {
    data.triggerDate = new Date(data.triggerDate)
  }
  if (body.type !== undefined && !(MESSAGE_TYPES as readonly string[]).includes(body.type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  if (body.mediaUrl !== undefined) data.mediaUrl = body.mediaUrl
  if (body.mediaBlobPath !== undefined) data.mediaBlobPath = body.mediaBlobPath
  if (body.mediaDurationSec !== undefined) {
    const n = Number(body.mediaDurationSec)
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: 'Invalid duration' }, { status: 400 })
    }
    data.mediaDurationSec = Math.round(n)
  }

  // Zip 2c.3: trim handles. Either field accepts null (clears the trim
  // on that side) or a non-negative integer-coercible number. We don't
  // cross-validate start < end here — the client UI enforces a 1s gap,
  // and even if a malformed pair slips in, the viewer is forgiving.
  for (const field of ['mediaTrimStartSec', 'mediaTrimEndSec'] as const) {
    if (body[field] !== undefined) {
      if (body[field] === null) {
        data[field] = null
      } else {
        const n = Number(body[field])
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

  if (body.state !== undefined) {
    if (!(MESSAGE_STATES as readonly string[]).includes(body.state)) {
      return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
    }
    if (body.state === 'scheduled') {
      const triggerDate = data.triggerDate ?? existing.triggerDate
      const recipientName = data.recipientName ?? existing.recipientName
      const type = (data.type ?? existing.type) as MessageType
      const content = data.content ?? existing.content
      const mediaUrl = data.mediaUrl ?? existing.mediaUrl

      if (!triggerDate) return NextResponse.json({ error: 'Trigger date required to schedule' }, { status: 400 })
      if (!recipientName) return NextResponse.json({ error: 'Recipient required to schedule' }, { status: 400 })
      if (isTextType(type) && !content) {
        return NextResponse.json(
          { error: type === 'letter' ? 'Letter body required' : 'Story body required' },
          { status: 400 }
        )
      }
      if (isMediaType(type) && !mediaUrl) {
        return NextResponse.json(
          { error: type === 'video' ? 'Video required' : 'Photo required' },
          { status: 400 }
        )
      }
    }
    data.state = body.state as MessageState
  }

  const updated = await prisma.message.update({ where: { id }, data })
  return NextResponse.json(updated)
}

// DELETE — permanent. Only allowed for drafts.
//
// Policy (Zip 2c.2): once a message leaves the drafting state, the user
// can archive it but not destroy it.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.message.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!DELETABLE_STATES.has(existing.state as MessageState)) {
    return NextResponse.json(
      {
        error:
          'This message can no longer be deleted. Drafts can be deleted; sent, scheduled, or pending messages can only be archived.',
      },
      { status: 400 }
    )
  }

  if (existing.mediaUrl) {
    await deleteBlob(existing.mediaUrl)
  }
  await prisma.message.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
