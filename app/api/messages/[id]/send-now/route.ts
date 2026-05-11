// app/api/messages/[id]/send-now/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deliverMessage } from '@/lib/messageDelivery'

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

  // Require recipientEmail and content/media before allowing send.
  if (!message.recipientEmail) {
    return NextResponse.json({ error: 'Recipient email required' }, { status: 400 })
  }
  if (message.type === 'letter' && !message.content) {
    return NextResponse.json({ error: 'Letter body required' }, { status: 400 })
  }
  if (message.type === 'video' && !message.mediaUrl) {
    return NextResponse.json({ error: 'Video required' }, { status: 400 })
  }

  const sent = await deliverMessage(id)
  return NextResponse.json(sent)
}
