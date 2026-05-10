// app/api/stats/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/userBootstrap'
import { getPhotoLimit, getQuotaStatus } from '@/lib/plans'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureUser(userId)

  const [
    timelineCount,
    messageCount,
    arrangementCount,
    contactCount,
    vaultCount,
    photoCount,
    executor,
    user,
  ] = await Promise.all([
    prisma.timelineItem.count({ where: { userId } }),
    prisma.message.count({ where: { userId } }),
    prisma.arrangement.count({ where: { userId } }),
    prisma.contact.count({ where: { userId } }),
    prisma.vaultItem.count({ where: { userId } }),
    prisma.photo.count({ where: { userId } }),
    prisma.executor.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }),
  ])

  const photoLimit = getPhotoLimit(user?.plan)

  return NextResponse.json({
    timelineCount,
    messageCount,
    arrangementCount,
    contactCount,
    vaultCount,
    photoCount,
    hasExecutor: !!executor,
    plan: user?.plan ?? 'basic',
    photoQuota: getQuotaStatus(photoCount, photoLimit),
  })
}
