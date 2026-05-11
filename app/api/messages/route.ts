// app/api/messages/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/userBootstrap'
import { generateToken, MESSAGE_STATES, type MessageState } from '@/lib/messageHelpers'
import { getMessageMinutesLimit, getQuotaStatus } from '@/lib/plans'

// GET — list messages for current user, optionally filtered by state
export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureUser(userId)

  const { searchParams } = new URL(request.url)
  const stateFilter = searchParams.get('state')

  const where: { userId: string; state?: MessageState } = { userId }
  if (stateFilter && (MESSAGE_STATES as readonly string[]).includes(stateFilter)) {
    where.state = stateFilter as MessageState
  }

  const messages = await prisma.message.findMany({
    where,
    orderBy: [{ updatedAt: 'desc' }],
    select: {
      id: true,
      recipientName: true,
      recipientEmail: true,
      type: true,
      subject: true,
      content: true,
      mediaUrl: true,
      mediaDurationSec: true,
      triggerDate: true,
      state: true,
      approvalPromptedAt: true,
      approvalExpiresAt: true,
      sentAt: true,
      archivedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  // Quota
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  })
  const minutesLimit = getMessageMinutesLimit(user?.plan)
  const totalSeconds = await prisma.message.aggregate({
    where: { userId, mediaDurationSec: { not: null } },
    _sum: { mediaDurationSec: true },
  })
  const usedMinutes = Math.ceil((totalSeconds._sum.mediaDurationSec ?? 0) / 60)

  return NextResponse.json({
    messages,
    videoQuota: getQuotaStatus(usedMinutes, minutesLimit),
  })
}

// POST — create a draft (no recipient required at creation; user fills in as they go)
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureUser(userId)

  const body = await request.json().catch(() => ({}))
  const type = body.type === 'video' ? 'video' : 'letter'

  const message = await prisma.message.create({
    data: {
      userId,
      type,
      recipientName: body.recipientName ?? '',
      recipientEmail: body.recipientEmail ?? null,
      subject: body.subject ?? null,
      content: body.content ?? null,
      state: 'drafting',
      approvalToken: generateToken(), // pre-generated so the same token can sign approval emails later
    },
  })

  return NextResponse.json(message)
}
