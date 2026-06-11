// app/dashboard/arrangements/page.tsx
//
// Zip 2d.1.2 — Cohesion pass.
//   - AppNav at top (was missing, lost the nav bar on this page)
//   - Reads arrFinalMessage from Settings and passes it to the view
//   - structuredData uses Prisma.DbNull in the createMany payload (Prisma 7
//     requires the typed sentinel for a nullable Json column).

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma, Prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/userBootstrap'
import { SEED_ITEMS, CATEGORY_ORDER } from '@/lib/arrangement-seeds'
import { AppNav } from '@/components/AppNav'
import ArrangementsView from '@/components/ArrangementsView'

export const dynamic = 'force-dynamic'

export default async function ArrangementsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  await ensureUser(userId)

  const settings = await prisma.settings.upsert({
    where: { userId },
    create: { userId },
    update: {},
  })

  if (!settings.arrSeededAt) {
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
  }

  const [arrangements, freshSettings] = await Promise.all([
    prisma.arrangement.findMany({
      where: { userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.settings.findUnique({ where: { userId } }),
  ])

  const acks = {
    disposition: !!freshSettings?.arrAckDisposition,
    service: !!freshSettings?.arrAckService,
    notifications: !!freshSettings?.arrAckNotifications,
    legal: !!freshSettings?.arrAckLegal,
    wishes: !!freshSettings?.arrAckWishes,
  }

  const serialized = arrangements.map((a) => ({
    id: a.id,
    category: a.category,
    title: a.title,
    status: a.status,
    isCore: a.isCore,
    structuredData: a.structuredData as Record<string, unknown> | null,
    notes: a.notes,
    vendor: a.vendor,
    contact: a.contact,
  }))

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#2c2416] relative overflow-x-hidden">
      <AppNav />
      <ArrangementsView
        arrangements={serialized}
        acks={acks}
        finalMessage={freshSettings?.arrFinalMessage ?? null}
      />
    </div>
  )
}
