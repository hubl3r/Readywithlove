// app/api/photos/reorder/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface ReorderItem {
  id: string
  order: number
}

// POST — batch update order for many photos at once. Used by drag-to-reorder.
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const items: ReorderItem[] = Array.isArray(body.items) ? body.items : []
  if (items.length === 0) return NextResponse.json({ success: true })

  // Verify all belong to this user before doing any writes
  const ids = items.map((i) => i.id)
  const owned = await prisma.photo.findMany({
    where: { id: { in: ids }, userId },
    select: { id: true },
  })
  if (owned.length !== ids.length) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Update each one. For a few dozen photos this is fine; if reorder ever
  // needs to handle hundreds we'd switch to a single SQL CASE statement.
  await prisma.$transaction(
    items.map((item) =>
      prisma.photo.update({
        where: { id: item.id },
        data: { order: item.order },
      })
    )
  )

  return NextResponse.json({ success: true })
}
