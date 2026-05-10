// app/api/timeline/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all timeline items for the current user
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Make sure user exists in our DB
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: userId,
    },
  })

  const items = await prisma.timelineItem.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
  })

  return NextResponse.json(items)
}

// POST a new timeline item
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { date, title, story, mediaUrl } = body

  if (!date || !title) {
    return NextResponse.json({ error: 'Date and title are required' }, { status: 400 })
  }

  // Make sure user exists
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: userId,
    },
  })

  const item = await prisma.timelineItem.create({
    data: {
      userId,
      date: new Date(date),
      title,
      story: story || null,
      mediaUrl: mediaUrl || null,
    },
  })

  return NextResponse.json(item)
}
