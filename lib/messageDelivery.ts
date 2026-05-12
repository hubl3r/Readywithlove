// lib/messageDelivery.ts
import { prisma } from './prisma'
import { generateToken } from './messageHelpers'
import { sendDeliveryEmail } from './email/sendDelivery'

/**
 * Deliver a message: generate a delivery token, email the recipient,
 * and transition state to 'sent'. Used by:
 *  - User approving via dashboard or email link
 *  - User clicking "Send now"
 *  - Cron auto-delivering after 14-day silence
 *  - Cron auto-delivering when deceasedAt is set and trigger date passes
 *
 * Zip 2c.2.2: preview generation expanded for 4 types (letter, video, photo, story).
 */
export async function deliverMessage(messageId: string) {
  const msg = await prisma.message.findUnique({
    where: { id: messageId },
    include: { user: { select: { name: true, email: true } } },
  })
  if (!msg) throw new Error('Message not found')
  if (msg.state === 'sent') return msg

  const deliveryToken = msg.deliveryToken ?? generateToken()

  if (msg.recipientEmail) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.readywithlove.com'
    const viewUrl = `${base}/m/${deliveryToken}`
    const fromName = msg.user.name ?? 'A loved one'

    // Per-type email preview. Text types: first 30 words. Video: literal
    // line. Photo: literal line. Keeps preview short for the email body
    // without leaking too much of the message — recipient gets the full
    // version on the view page.
    const preview = (() => {
      if (msg.type === 'letter' || msg.type === 'story') {
        return (msg.content ?? '').split(/\s+/).slice(0, 30).join(' ')
      }
      if (msg.type === 'video') return 'A video message'
      if (msg.type === 'photo') return 'A photo'
      return ''
    })()

    await sendDeliveryEmail({
      to: msg.recipientEmail,
      recipientName: msg.recipientName,
      fromName,
      viewUrl,
      messagePreview: preview || undefined,
    })
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: {
      state: 'sent',
      sentAt: new Date(),
      deliveryToken,
    },
  })

  return updated
}
