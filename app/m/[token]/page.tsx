// app/m/[token]/page.tsx
import { prisma } from '@/lib/prisma'

export const metadata = {
  title: 'A message for you · ReadyWithLove',
}

// Server component — fetches the message by token and renders inline.
// No auth required; the token IS the auth. Tokens are 256 bits so guessing
// is computationally infeasible.

export default async function PublicMessagePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const message = await prisma.message.findUnique({
    where: { deliveryToken: token },
    include: { user: { select: { name: true } } },
  })

  if (!message || message.state !== 'sent') {
    return <NotFound />
  }

  const fromName = message.user.name ?? 'A loved one'
  const sentDate = message.sentAt
    ? new Date(message.sentAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

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
        <p className="flex items-baseline gap-2 md:gap-3">
          <span className="text-xl md:text-3xl font-serif italic tracking-tight">Ready</span>
          <span className="h-px w-6 bg-[#2c2416] hidden sm:block" />
          <span className="text-[10px] md:text-xl tracking-[0.2em] md:tracking-[0.3em] uppercase text-[#5c4d2e]">
            with love
          </span>
        </p>
      </header>

      <main className="relative z-10 max-w-[800px] mx-auto px-5 md:px-12 py-12 md:py-20">
        <p className="text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] uppercase text-[#8b6f3a] mb-3 md:mb-4">
          · A message has been left for you ·
        </p>
        <h1 className="font-serif text-4xl md:text-6xl leading-tight mb-3 md:mb-4">
          From <span className="italic text-[#8b6f3a]">{fromName}</span>
        </h1>
        <p className="text-base md:text-lg text-[#5c4d2e] mb-2">
          To: <span className="italic">{message.recipientName}</span>
        </p>
        {sentDate && (
          <p className="text-sm italic text-[#8b6f3a]/80 mb-8 md:mb-10">
            Delivered {sentDate}
          </p>
        )}

        {message.subject && (
          <p className="font-serif italic text-xl md:text-3xl text-[#5c4d2e] mb-8 md:mb-10">
            {message.subject}
          </p>
        )}

        {message.type === 'video' && message.mediaUrl ? (
          <video
            src={message.mediaUrl}
            controls
            className="w-full bg-black"
          />
        ) : (
          <div className="bg-[#f5f1e8]/80 border border-[#2c2416]/10 p-6 md:p-12 font-serif text-base md:text-lg leading-relaxed whitespace-pre-wrap text-[#2c2416]">
            {message.content}
          </div>
        )}

        <p className="mt-10 md:mt-14 text-sm md:text-base italic text-[#8b6f3a] text-center">
          Take your time. Read it again whenever you like.
        </p>
      </main>

      <footer className="relative z-10 max-w-[1400px] mx-auto px-5 md:px-12 py-8 mt-12 border-t border-[#2c2416]/10 text-[10px] md:text-xs text-[#5c4d2e]/70 italic">
        Delivered with care by ReadyWithLove.
      </footer>
    </div>
  )
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f1e8] text-[#2c2416] px-5">
      <div className="text-center max-w-md">
        <h1 className="font-serif text-4xl md:text-5xl italic mb-4 text-[#8b6f3a]">
          This link is no longer active.
        </h1>
        <p className="text-base text-[#5c4d2e]">
          The message may have been revoked, or the link may be incomplete.
          If you believe this is in error, please contact the sender directly.
        </p>
      </div>
    </div>
  )
}
