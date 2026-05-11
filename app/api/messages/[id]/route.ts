// app/api/messages/[id]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteBlob } from '@/lib/blob'
import { MESSAGE_STATES, type MessageState } from '@/lib/messageHelpers'

const EDITABLE_FIELDS = [
  'recipientName',
  'recipientEmail',
  'subject',
  'content',
  'type',
  'triggerDate',
] as const

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
  if (body.type !== undefined && body.type !== 'letter' && body.type !== 'video') {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  // Media fields can be updated separately (after Blob upload).
  if (body.mediaUrl !== undefined) data.mediaUrl = body.mediaUrl
  if (body.mediaBlobPath !== undefined) data.mediaBlobPath = body.mediaBlobPath
  if (body.mediaDurationSec !== undefined) {
    const n = Number(body.mediaDurationSec)
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: 'Invalid duration' }, { status: 400 })
    }
    data.mediaDurationSec = Math.round(n)
  }

  // Allow transition to "scheduled" only if message has the bits it needs.
  if (body.state !== undefined) {
    if (!(MESSAGE_STATES as readonly string[]).includes(body.state)) {
      return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
    }
    if (body.state === 'scheduled') {
      const triggerDate = data.triggerDate ?? existing.triggerDate
      const recipientName = data.recipientName ?? existing.recipientName
      const type = data.type ?? existing.type
      const content = data.content ?? existing.content
      const mediaUrl = data.mediaUrl ?? existing.mediaUrl

      if (!triggerDate) return NextResponse.json({ error: 'Trigger date required to schedule' }, { status: 400 })
      if (!recipientName) return NextResponse.json({ error: 'Recipient required to schedule' }, { status: 400 })
      if (type === 'letter' && !content) return NextResponse.json({ error: 'Letter body required' }, { status: 400 })
      if (type === 'video' && !mediaUrl) return NextResponse.json({ error: 'Video required' }, { status: 400 })
    }
    data.state = body.state as MessageState
  }

  const updated = await prisma.message.update({ where: { id }, data })
  return NextResponse.json(updated)
}

// DELETE — permanent. Removes Blob media if attached.
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

  if (existing.mediaUrl) {
    await deleteBlob(existing.mediaUrl)
  }
  await prisma.message.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
