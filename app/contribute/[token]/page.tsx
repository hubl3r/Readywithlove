// app/contribute/[token]/page.tsx
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ContributeForm } from './ContributeForm'

export const metadata = {
  title: 'Share a memory · ReadyWithLove',
}

/**
 * Public contributor landing page. No auth — the token IS the auth.
 * Tokens are 256 bits (see lib/messageHelpers.generateToken).
 *
 * States:
 *   - valid invite → render ContributeForm with inviter name + personal note
 *   - revoked / expired / missing → friendly "no longer active" screen
 */
export default async function ContributePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const invite = await prisma.messageInvite.findUnique({
    where: { token },
    select: {
      id: true,
      contributorName: true,
      message: true,
      expiresAt: true,
      revokedAt: true,
      user: { select: { name: true } },
    },
  })

  if (!invite) {
    return <InactiveInvite reason="missing" />
  }
  if (invite.revokedAt) {
    return <InactiveInvite reason="revoked" />
  }
  if (invite.expiresAt < new Date()) {
    return <InactiveInvite reason="expired" />
  }

  const inviterName = invite.user.name?.trim() || 'A loved one'

  return (
    <PageShell>
      <p className="text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] uppercase text-[#8b6f3a] mb-3 md:mb-4">
        · An invitation to share ·
      </p>
      <h1 className="font-serif text-4xl md:text-6xl leading-tight mb-3 md:mb-4">
        For <span className="italic text-[#8b6f3a]">{inviterName}</span>
      </h1>
      <p className="text-base md:text-lg text-[#5c4d2e] font-light mb-2">
        Hello, <span className="italic">{invite.contributorName}</span>.
      </p>
      <p className="text-base md:text-lg text-[#5c4d2e] font-light mb-8 md:mb-10 max-w-2xl">
        {inviterName} has invited you to leave a memory, a story, or a few
        words — something they can carry forward. Take your time. Anything
        you share, no matter how small, will mean something.
      </p>

      {invite.message && (
        <blockquote className="border-l-2 border-[#8b6f3a] pl-5 md:pl-6 py-2 mb-10 md:mb-12 bg-[#8b6f3a]/5 max-w-2xl">
          <p className="font-serif italic text-base md:text-lg text-[#5c4d2e]">
            “{invite.message}”
          </p>
          <p className="text-xs md:text-sm text-[#8b6f3a] mt-2 not-italic tracking-wide">
            — {inviterName}
          </p>
        </blockquote>
      )}

      <ContributeForm token={token} contributorName={invite.contributorName} />
    </PageShell>
  )
}

function InactiveInvite({ reason }: { reason: 'missing' | 'revoked' | 'expired' }) {
  const headline =
    reason === 'expired'
      ? 'This invitation has expired'
      : reason === 'revoked'
        ? 'This invitation is no longer active'
        : 'We couldn’t find this invitation'

  const subtext =
    reason === 'expired'
      ? 'The link has aged past its window. Reach out to the person who sent it if you’d still like to share something.'
      : reason === 'revoked'
        ? 'The person who sent this has closed the link. Reach out to them directly to share a memory.'
        : 'The link may have been mistyped, or it never existed. Please check with the person who sent it.'

  return (
    <PageShell>
      <p className="text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] uppercase text-[#8b6f3a] mb-3 md:mb-4">
        · Inactive ·
      </p>
      <h1 className="font-serif text-3xl md:text-5xl leading-tight mb-4 md:mb-6">
        {headline}
      </h1>
      <p className="text-base md:text-lg text-[#5c4d2e] font-light max-w-xl">
        {subtext}
      </p>
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
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

      <main className="relative z-10 max-w-[800px] mx-auto px-5 md:px-12 py-12 md:py-20">
        {children}
      </main>

      <footer className="relative z-10 max-w-[1400px] mx-auto px-5 md:px-12 py-8 md:py-12 mt-12 md:mt-20 border-t border-[#2c2416]/10">
        <p className="text-xs md:text-sm italic text-[#8b6f3a]/80 text-center">
          ReadyWithLove · A place for the things we want them to know.
        </p>
      </footer>
    </div>
  )
}
