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
    contributionCount,
    unviewedContributionCount,
    executor,
    user,
  ] = await Promise.all([
    prisma.timelineItem.count({ where: { userId } }),
    prisma.message.count({ where: { userId } }),
    prisma.arrangement.count({ where: { userId } }),
    prisma.contact.count({ where: { userId } }),
    prisma.vaultItem.count({ where: { userId } }),
    prisma.photo.count({ where: { userId } }),
    // Contributions: total (non-archived). Used by the dashboard card.
    prisma.contribution.count({ where: { userId, archivedAt: null } }),
    // Unviewed: used by the dashboard card's "X new" indicator AND the
    // AppNav badge (already fetched separately via /api/contributions/stats
    // — that endpoint stays for backward compat).
    prisma.contribution.count({
      where: { userId, archivedAt: null, viewedByUser: false },
    }),
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
    contributionCount,
    unviewedContributionCount,
    hasExecutor: !!executor,
    plan: user?.plan ?? 'basic',
    photoQuota: getQuotaStatus(photoCount, photoLimit),
  })
}
