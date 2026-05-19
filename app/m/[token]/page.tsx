// app/m/[token]/page.tsx
//
// Recipient delivery view. This is what the email link points to. Public
// route (no Clerk gate). The token in the URL is the credential.
//
// Zip 2c.6:
//  - Looks up message by deliveryToken
//  - Increments viewCount atomically
//  - Honors linkRevokedAt — if set, shows "no longer available"
//  - Renders content with trim respect (video uses useTrimmedVideo)
//  - Provides "Share link" copy and per-type downloads:
//      letter / story → .txt
//      photo          → original file
//      video          → no download (preserves trim intent + quality)

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { RecipientView } from './RecipientView'

interface PageProps {
  params: Promise<{ token: string }>
}

export const dynamic = 'force-dynamic' // never cache; view count must be live

export default async function RecipientMessagePage({ params }: PageProps) {
  const { token } = await params

  // Find message. Includes sender's name (anonymized to first name on the
  // recipient page; we never show emails or last names — privacy-by-default).
  const msg = await prisma.message.findUnique({
    where: { deliveryToken: token },
    include: {
      user: { select: { name: true } },
    },
  })

  if (!msg) {
    // No message with this token. We return notFound() rather than a
    // custom "this link is broken" page because the alternative reveals
    // that tokens exist at all (a tiny enumeration signal).
    notFound()
  }
  // After notFound() the function never returns. This typed assignment
  // narrows `msg` to non-null for TypeScript's benefit.
  const message = msg

  // Revoked links: bail before incrementing view count. Senders who revoke
  // shouldn't see their viewCount tick up from people hitting the dead link.
  if (message.linkRevokedAt) {
    return <RevokedNotice />
  }

  // Not yet delivered? The cron sets state=sent and sentAt at delivery time.
  // If somehow a recipient has the URL early (manual share, leak from the
  // sender's clipboard), don't reveal content until delivery has actually
  // happened.
  if (message.state !== 'sent') {
    return <NotYetAvailableNotice />
  }

  // Increment view count. Best-effort: if the update fails (e.g., DB hiccup)
  // we still serve the message — better to show the recipient their letter
  // than to hold it hostage to telemetry.
  try {
    await prisma.message.update({
      where: { id: message.id },
      data: { viewCount: { increment: 1 } },
    })
  } catch {
    /* swallow */
  }

  // First name only for the sender display. If they put "Adam Hubler" we
  // show "Adam"; if they put just a single name, that's fine. Defensive
  // against null because the User.name field is nullable.
  const fromFirstName = (message.user.name ?? 'A loved one').split(' ')[0]

  return (
    <RecipientView
      type={message.type}
      subject={message.subject}
      content={message.content}
      mediaUrl={message.mediaUrl}
      mediaTrimStartSec={message.mediaTrimStartSec}
      mediaTrimEndSec={message.mediaTrimEndSec}
      recipientName={message.recipientName}
      fromName={fromFirstName}
      sentAt={message.sentAt?.toISOString() ?? null}
    />
  )
}

function RevokedNotice() {
  return (
    <div className="min-h-screen bg-[#f5f1e8] flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#8b6f3a] mb-4">
          ReadyWithLove
        </p>
        <h1 className="font-serif text-2xl md:text-3xl text-[#2c2416] mb-4">
          This message is no longer available
        </h1>
        <p className="font-serif italic text-[#5c4d2e] leading-relaxed">
          The sender has withdrawn this link. If you believe this is a
          mistake, please reach out to them directly.
        </p>
      </div>
    </div>
  )
}

function NotYetAvailableNotice() {
  return (
    <div className="min-h-screen bg-[#f5f1e8] flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#8b6f3a] mb-4">
          ReadyWithLove
        </p>
        <h1 className="font-serif text-2xl md:text-3xl text-[#2c2416] mb-4">
          This message isn&rsquo;t ready yet
        </h1>
        <p className="font-serif italic text-[#5c4d2e] leading-relaxed">
          It hasn&rsquo;t been delivered. You&rsquo;ll receive an email
          when it is.
        </p>
      </div>
    </div>
  )
}
