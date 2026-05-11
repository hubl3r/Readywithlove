// app/api/messages/[id]/restore/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const message = await prisma.message.findUnique({ where: { id } })
  if (!message || message.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (message.state !== 'archived') {
    return NextResponse.json({ error: 'Not archived' }, { status: 400 })
  }

  const updated = await prisma.message.update({
    where: { id },
    data: { state: 'drafting', archivedAt: null },
  })
  return NextResponse.json(updated)
}
