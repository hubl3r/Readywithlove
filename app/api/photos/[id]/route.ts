// app/api/photos/[id]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteBlob } from '@/lib/blob'

// PATCH — update caption or order
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const existing = await prisma.photo.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await prisma.photo.update({
    where: { id },
    data: {
      ...(body.caption !== undefined && { caption: body.caption || null }),
      ...(typeof body.order === 'number' && { order: body.order }),
      ...(body.timelineItemId !== undefined && {
        timelineItemId: body.timelineItemId || null,
      }),
    },
  })

  return NextResponse.json(updated)
}

// DELETE — remove from DB and Blob
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const existing = await prisma.photo.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Delete from Blob first; if it fails we still drop the DB row to keep the
  // user's view consistent. Orphaned blobs can be reaped from the dashboard.
  await deleteBlob(existing.url)
  await prisma.photo.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
