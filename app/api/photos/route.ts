// app/api/photos/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/userBootstrap'
import { uploadBlob, BLOB_CONFIGURED } from '@/lib/blob'
import { getPhotoLimit, getQuotaStatus } from '@/lib/plans'

// Max upload size after compression. Compressed images are usually well
// under 1MB; this is just a safety ceiling against pathological cases.
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024 // 8 MB

// GET — list all of the current user's photos
export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureUser(userId)

  const { searchParams } = new URL(request.url)
  const timelineItemId = searchParams.get('timelineItemId')

  const photos = await prisma.photo.findMany({
    where: {
      userId,
      ...(timelineItemId ? { timelineItemId } : {}),
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    include: {
      timelineItem: {
        select: { id: true, title: true, date: true },
      },
    },
  })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  })

  const limit = getPhotoLimit(user?.plan)
  const totalCount = await prisma.photo.count({ where: { userId } })

  return NextResponse.json({
    photos,
    quota: getQuotaStatus(totalCount, limit),
  })
}

// POST — upload a new photo (multipart/form-data)
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!BLOB_CONFIGURED) {
    return NextResponse.json(
      { error: 'Photo storage is not configured yet. See README_BLOB_SETUP.md.' },
      { status: 503 }
    )
  }

  await ensureUser(userId)

  const form = await request.formData()
  const file = form.get('file')
  const timelineItemId = form.get('timelineItemId') as string | null
  const caption = form.get('caption') as string | null
  const widthRaw = form.get('width') as string | null
  const heightRaw = form.get('height') as string | null

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File too large after compression' }, { status: 413 })
  }

  // Quota check
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  })
  const limit = getPhotoLimit(user?.plan)
  const currentCount = await prisma.photo.count({ where: { userId } })
  if (currentCount >= limit) {
    return NextResponse.json(
      {
        error: 'Photo limit reached',
        message: `Your ${user?.plan ?? 'basic'} plan allows ${limit} photos. Upgrade to add more.`,
        quota: getQuotaStatus(currentCount, limit),
      },
      { status: 402 } // Payment Required — semantically right for quota
    )
  }

  // If timelineItemId given, verify it belongs to user
  if (timelineItemId) {
    const owns = await prisma.timelineItem.findFirst({
      where: { id: timelineItemId, userId },
      select: { id: true },
    })
    if (!owns) {
      return NextResponse.json({ error: 'Timeline item not found' }, { status: 404 })
    }
  }

  // Upload to Blob
  const ext = (file.type.split('/')[1] || 'jpg').toLowerCase()
  const filename = `photos/${userId}/${Date.now()}.${ext}`

  let uploaded
  try {
    uploaded = await uploadBlob({
      filename,
      contentType: file.type || 'image/jpeg',
      body: file,
    })
  } catch (err) {
    console.error('[photos] blob upload failed:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  // Compute next order in target group
  const maxOrder = await prisma.photo.aggregate({
    where: { userId, timelineItemId: timelineItemId || null },
    _max: { order: true },
  })

  const photo = await prisma.photo.create({
    data: {
      userId,
      timelineItemId: timelineItemId || null,
      url: uploaded.url,
      blobPath: uploaded.pathname,
      caption: caption || null,
      width: widthRaw ? parseInt(widthRaw, 10) : null,
      height: heightRaw ? parseInt(heightRaw, 10) : null,
      sizeBytes: uploaded.size,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  })

  return NextResponse.json(photo)
}
