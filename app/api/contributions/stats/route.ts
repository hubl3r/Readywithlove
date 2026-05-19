// app/api/contributions/stats/route.ts
//
// Zip 2c.5 hotfix 5: returns simple unread counts used by AppNav to show
// the activity dot next to "Contributions" in the nav. Previously this
// route didn't exist — AppNav called it on every mount and got 404,
// flooding the console with errors.
//
// Response shape — AppNav reads `unviewedCount`. Keeping the field name
// matches AppNav's existing client code without requiring changes there.
// (We also return `totalCount` for symmetry / future use.)

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({
      unviewedCount: 0,
      totalCount: 0,
    })
  }

  const [unviewed, total] = await Promise.all([
    prisma.contribution.count({
      where: {
        userId,
        viewedByUser: false,
        archivedAt: null,
      },
    }),
    prisma.contribution.count({
      where: { userId, archivedAt: null },
    }),
  ])

  return NextResponse.json({
    unviewedCount: unviewed,
    totalCount: total,
  })
}
