// app/contribute/[token]/sent/[contributionId]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SentReview } from './SentReview'

export const metadata = {
  title: 'Review · ReadyWithLove',
}

/**
 * Server shell for the contributor's review/edit page. Loads the
 * contribution + invite, validates token ownership, hands off to
 * SentReview (client) for the interactive bits.
 */
export default async function SentPage({
  params,
}: {
  params: Promise<{ token: string; contributionId: string }>
}) {
  const { token, contributionId } = await params

  const invite = await prisma.messageInvite.findUnique({
    where: { token },
    select: {
      id: true,
      contributorName: true,
      user: { select: { name: true } },
    },
  })
  if (!invite) {
    notFound()
    return null
  }

  const contribution = await prisma.contribution.findUnique({
    where: { id: contributionId },
    select: {
      id: true,
      inviteId: true,
      type: true,
      content: true,
      mediaUrl: true,
      mediaDurationSec: true,
      mediaTrimStartSec: true,
      mediaTrimEndSec: true,
      contributorNote: true,
      viewedByUser: true,
      createdAt: true,
    },
  })

  if (!contribution || contribution.inviteId !== invite.id) {
    notFound()
    return null
  }

  const inviterName = invite.user.name?.trim() || 'them'

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#2c2416] relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-40 -left-40 w-[500px] md:w-[800px] h-[500px] md:h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,111,58,0.18) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <header className="relative z-10 max-w-[1400px] mx-auto px-5 md:px-12 py-5 md:py-8 border-b border-[#2c2416]/10">
        <Link href="/" className="flex items-baseline gap-2 md:gap-3 hover:opacity-80 transition">
          <span className="text-xl md:text-3xl font-serif italic tracking-tight">Ready</span>
          <span className="h-px w-6 bg-[#2c2416] hidden sm:block" />
          <span className="text-[10px] md:text-xl tracking-[0.2em] md:tracking-[0.3em] uppercase text-[#5c4d2e]">
            with love
          </span>
        </Link>
      </header>

      <main className="relative z-10 max-w-[800px] mx-auto px-5 md:px-12 py-10 md:py-14">
        <Link
          href={`/contribute/${token}/thanks`}
          className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#8b6f3a] hover:text-[#2c2416] transition"
        >
          ← Back to what you’ve sent
        </Link>

        <SentReview
          token={token}
          inviterName={inviterName}
          contribution={{
            id: contribution.id,
            type: contribution.type as 'letter' | 'video' | 'photo' | 'story',
            content: contribution.content,
            mediaUrl: contribution.mediaUrl,
            mediaDurationSec: contribution.mediaDurationSec,
            mediaTrimStartSec: contribution.mediaTrimStartSec,
            mediaTrimEndSec: contribution.mediaTrimEndSec,
            contributorNote: contribution.contributorNote,
            viewedByUser: contribution.viewedByUser,
            createdAt: contribution.createdAt.toISOString(),
          }}
        />
      </main>

      <footer className="relative z-10 max-w-[1400px] mx-auto px-5 md:px-12 py-8 md:py-12 mt-12 md:mt-20 border-t border-[#2c2416]/10">
        <p className="text-xs md:text-sm italic text-[#8b6f3a]/80 text-center">
          ReadyWithLove · A place for the things we want them to know.
        </p>
      </footer>
    </div>
  )
}
