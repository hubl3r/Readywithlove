// app/api/messages/[id]/postpone/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  if (!body.triggerDate) {
    return NextResponse.json({ error: 'triggerDate required' }, { status: 400 })
  }
  const newDate = new Date(body.triggerDate)
  if (isNaN(newDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const message = await prisma.message.findUnique({ where: { id } })
  if (!message || message.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (message.state === 'sent') {
    return NextResponse.json({ error: 'Already sent' }, { status: 400 })
  }

  // Postpone resets the approval clock — back to scheduled.
  const updated = await prisma.message.update({
    where: { id },
    data: {
      triggerDate: newDate,
      state: 'scheduled',
      approvalPromptedAt: null,
      approvalExpiresAt: null,
      approvalRemindersSent: 0,
    },
  })
  return NextResponse.json(updated)
}
