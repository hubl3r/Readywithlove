// app/api/messages/[id]/send-now/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deliverMessage } from '@/lib/messageDelivery'
import { isTextType, isMediaType, type MessageType } from '@/lib/messageHelpers'

export async function POST(
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
  if (message.state === 'sent') {
    return NextResponse.json({ error: 'Already sent' }, { status: 400 })
  }

  if (!message.recipientEmail) {
    return NextResponse.json({ error: 'Recipient email required' }, { status: 400 })
  }

  // Per-type pre-send validation. Text types need content; media types
  // need an uploaded blob URL.
  const type = message.type as MessageType
  if (isTextType(type) && !message.content) {
    return NextResponse.json(
      { error: type === 'letter' ? 'Letter body required' : 'Story body required' },
      { status: 400 }
    )
  }
  if (isMediaType(type) && !message.mediaUrl) {
    return NextResponse.json(
      { error: type === 'video' ? 'Video required' : 'Photo required' },
      { status: 400 }
    )
  }

  const sent = await deliverMessage(id)
  return NextResponse.json(sent)
}
