// app/api/arrangements/seed/route.ts
//
// Zip 2d.1.1 — Hotfix for PrismaClientValidationError on createMany.
//
// Same bug as page.tsx: structuredData: undefined breaks createMany on
// a Json? field. Prisma 7 wants the typed Prisma.DbNull sentinel.

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma, Prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/userBootstrap'
import { SEED_ITEMS, CATEGORY_ORDER } from '@/lib/arrangement-seeds'

export const runtime = 'nodejs'

export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureUser(userId)

  const settings = await prisma.settings.upsert({
    where: { userId },
    create: { userId },
    update: {},
  })

  if (settings.arrSeededAt) {
    return NextResponse.json({ seeded: false, alreadySeeded: true })
  }

  const categoryIndex: Record<string, number> = {}
  CATEGORY_ORDER.forEach((c, i) => {
    categoryIndex[c] = i
  })

  const rows = SEED_ITEMS.map((item, idx) => ({
    userId,
    category: item.category,
    title: item.title,
    isCore: !!item.isCore,
    status: 'planned',
    executorVisibleAfterDeath: true,
    sortOrder:
      (categoryIndex[item.category] ?? 99) * 1000 +
      idx -
      (item.isCore ? 500 : 0),
    // DbNull (not literal null/undefined) — Prisma 7 requires the typed
    // sentinel to set a nullable Json column to SQL NULL in createMany.
    structuredData: Prisma.DbNull,
    vendor: null,
    contact: null,
    notes: item.hint ?? null,
  }))

  await prisma.$transaction([
    prisma.arrangement.createMany({ data: rows }),
    prisma.settings.update({
      where: { userId },
      data: { arrSeededAt: new Date() },
    }),
  ])

  return NextResponse.json({ seeded: true, count: rows.length })
}
