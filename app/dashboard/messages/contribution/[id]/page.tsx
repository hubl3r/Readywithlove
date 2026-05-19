// app/dashboard/messages/contribution/[id]/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/userBootstrap'
import { ContributionView } from './ContributionView'

export const metadata = {
  title: 'A memory · ReadyWithLove',
}

/**
 * Server component shell — auth + fetch + ownership check, then hand off
 * to the client component for the interactive bits (archive button,
 * import-to-timeline button, copy contributor email, etc.).
 *
 * Marking viewed is handled by the /api/contributions/[id] GET endpoint,
 * which the client component calls on mount (cheap; one extra round-trip
 * but means the unread-dot logic is consistent across surfaces).
 */
export default async function ContributionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  await ensureUser(userId)

  const { id } = await params

  const contribution = await prisma.contribution.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      type: true,
      contributorName: true,
      contributorNote: true,
      content: true,
      mediaUrl: true,
      mediaDurationSec: true,
      mediaTrimStartSec: true,
      mediaTrimEndSec: true,
      viewedByUser: true,
      archivedAt: true,
      importedToTimelineItemId: true,
      createdAt: true,
      invite: {
        select: { id: true, contributorEmail: true, message: true, revokedAt: true },
      },
    },
  })

  if (!contribution || contribution.userId !== userId) {
    notFound()
    return null
  }

  // Zip 2c.4: fetch the timeline item's date so the view can show
  // "✓ Added to 1975" when already imported.
  let importedToTimelineDate: string | null = null
  if (contribution.importedToTimelineItemId) {
    const item = await prisma.timelineItem.findUnique({
      where: { id: contribution.importedToTimelineItemId },
      select: { date: true },
    })
    if (item) importedToTimelineDate = item.date.toISOString()
  }

  return (
    <ContributionView
      contribution={{
        id: contribution.id,
        type: contribution.type as 'letter' | 'video' | 'photo' | 'story',
        contributorName: contribution.contributorName,
        contributorEmail: contribution.invite.contributorEmail,
        contributorNote: contribution.contributorNote,
        inviteMessage: contribution.invite.message,
        inviteId: contribution.invite.id,
        inviteRevokedAt: contribution.invite.revokedAt?.toISOString() ?? null,
        content: contribution.content,
        mediaUrl: contribution.mediaUrl,
        mediaDurationSec: contribution.mediaDurationSec,
        mediaTrimStartSec: contribution.mediaTrimStartSec,
        mediaTrimEndSec: contribution.mediaTrimEndSec,
        viewedByUser: contribution.viewedByUser,
        archivedAt: contribution.archivedAt?.toISOString() ?? null,
        importedToTimelineItemId: contribution.importedToTimelineItemId,
        importedToTimelineDate,
        createdAt: contribution.createdAt.toISOString(),
      }}
    />
  )
}
