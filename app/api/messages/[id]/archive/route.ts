// app/api/messages/[id]/archive/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

async function archive(messageId: string, viaToken: string | null) {
  let message
  if (viaToken) {
    message = await prisma.message.findUnique({
      where: { approvalToken: viaToken },
    })
    if (!message || message.id !== messageId) {
      return NextResponse.json({ error: 'Invalid link' }, { status: 403 })
    }
  } else {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    message = await prisma.message.findUnique({ where: { id: messageId } })
    if (!message || message.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  if (message.state === 'sent') {
    return NextResponse.json({ error: 'Cannot archive sent message' }, { status: 400 })
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { state: 'archived', archivedAt: new Date() },
  })
  return NextResponse.json(updated)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const url = new URL(request.url)
  return archive(id, url.searchParams.get('token'))
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  const result = await archive(id, token)
  if (token && result.status === 200) {
    return NextResponse.redirect(new URL(`/dashboard/messages?archived=1`, request.url))
  }
  return result
}
