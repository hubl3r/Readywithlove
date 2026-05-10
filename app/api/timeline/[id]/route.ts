// app/api/timeline/[id]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH update an item
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  // Verify ownership
  const existing = await prisma.timelineItem.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await prisma.timelineItem.update({
    where: { id },
    data: {
      ...(body.date && { date: new Date(body.date) }),
      ...(body.title && { title: body.title }),
      ...(body.story !== undefined && { story: body.story }),
      ...(body.mediaUrl !== undefined && { mediaUrl: body.mediaUrl }),
    },
  })

  return NextResponse.json(updated)
}

// DELETE an item
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const existing = await prisma.timelineItem.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.timelineItem.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
