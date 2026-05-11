// app/contribute/[token]/thanks/page.tsx
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const metadata = {
  title: 'Thank you · ReadyWithLove',
}

/**
 * Confirmation screen after a contribution is submitted. We re-look-up the
 * invite to personalize the message (inviter name), but never block on it —
 * if the invite is gone for some reason, we still thank the contributor.
 *
 * Importantly, the invite is still valid here (not revoked/expired by virtue
 * of just having been used). The contributor can return and add more if they
 * like — there's a link back to the contribute page.
 */
export default async function ThanksPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const invite = await prisma.messageInvite.findUnique({
    where: { token },
    select: {
      contributorName: true,
      revokedAt: true,
      expiresAt: true,
      user: { select: { name: true } },
    },
  })

  const inviterName = invite?.user.name?.trim() || 'them'
  const stillActive =
    invite && !invite.revokedAt && invite.expiresAt > new Date()

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

      <main className="relative z-10 max-w-[800px] mx-auto px-5 md:px-12 py-16 md:py-24 text-center">
        <p className="text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] uppercase text-[#8b6f3a] mb-4 md:mb-6">
          · Received ·
        </p>
        <h1 className="font-serif text-4xl md:text-6xl leading-tight mb-5 md:mb-7">
          Thank you.
        </h1>
        <p className="font-serif italic text-lg md:text-2xl text-[#5c4d2e] mb-3 md:mb-4 max-w-xl mx-auto">
          {inviterName === 'them' ? 'It’s safely in the shoebox.' : `It’s safely in ${inviterName}’s shoebox.`}
        </p>
        <p className="text-base md:text-lg text-[#5c4d2e] font-light max-w-xl mx-auto mb-10 md:mb-14">
          What you shared will be kept and carried forward. Whenever it’s the
          right time for {inviterName === 'them' ? 'them' : inviterName} to see it, they will.
        </p>

        {stillActive && (
          <Link
            href={`/contribute/${token}`}
            className="inline-flex items-center gap-2 border border-[#2c2416] text-[#2c2416] px-6 md:px-8 py-3 md:py-4 hover:bg-[#2c2416] hover:text-[#f5f1e8] transition text-xs tracking-[0.2em] uppercase"
          >
            Add another memory
            <span>+</span>
          </Link>
        )}
      </main>

      <footer className="relative z-10 max-w-[1400px] mx-auto px-5 md:px-12 py-8 md:py-12 mt-12 md:mt-20 border-t border-[#2c2416]/10">
        <p className="text-xs md:text-sm italic text-[#8b6f3a]/80 text-center">
          ReadyWithLove · A place for the things we want them to know.
        </p>
      </footer>
    </div>
  )
}
