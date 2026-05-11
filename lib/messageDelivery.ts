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
 */
export async function deliverMessage(messageId: string) {
  const msg = await prisma.message.findUnique({
    where: { id: messageId },
    include: { user: { select: { name: true, email: true } } },
  })
  if (!msg) throw new Error('Message not found')
  if (msg.state === 'sent') return msg

  // Ensure delivery token exists
  const deliveryToken = msg.deliveryToken ?? generateToken()

  // Send email if recipient has an email address. Failures don't block the
  // state change — we keep an audit trail in logs and the user can resend.
  if (msg.recipientEmail) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.readywithlove.com'
    const viewUrl = `${base}/m/${deliveryToken}`
    const fromName = msg.user.name ?? 'A loved one'
    const preview =
      msg.type === 'letter'
        ? (msg.content ?? '').split(/\s+/).slice(0, 30).join(' ')
        : 'A video message'

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
