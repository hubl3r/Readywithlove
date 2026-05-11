// app/api/messages/[id]/approve/route.ts
//
// Two callers:
// 1. Logged-in user from the dashboard (POST, auth via Clerk)
// 2. Token-based link from an email (GET with ?token=...)
//
// Both transition pending_approval → triggers the send pipeline.
// "Send now" from any state (drafting/scheduled too) also routes here.

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deliverMessage } from '@/lib/messageDelivery'

async function approve(messageId: string, viaToken: string | null) {
  // Token-based path skips auth — token IS the auth.
  let message
  if (viaToken) {
    message = await prisma.message.findUnique({
      where: { approvalToken: viaToken },
    })
    if (!message || message.id !== messageId) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 403 })
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
    return NextResponse.json({ message, alreadySent: true })
  }
  if (message.state === 'archived') {
    return NextResponse.json({ error: 'Restore first' }, { status: 400 })
  }

  const sent = await deliverMessage(message.id)
  return NextResponse.json(sent)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  return approve(id, token)
}

// GET supports the email-link case — keeps it one-click in a mail client
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  const result = await approve(id, token)

  // For email-link path, redirect to a "thanks, it's sent" page in the app
  if (token && result.status === 200) {
    return NextResponse.redirect(new URL(`/dashboard/messages/${id}?sent=1`, request.url))
  }
  return result
}
