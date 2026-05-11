// lib/email/sendDelivery.ts
import { sendEmail, type SendResult } from '../resend'
import { emailLayout, escapeHtml } from './layout'

export interface DeliveryEmailParams {
  to: string
  recipientName: string
  fromName: string                // the user who left the message
  viewUrl: string                 // /m/[token]
  messagePreview?: string         // first ~30 words of letter, or "A video message" for video
}

export async function sendDeliveryEmail(p: DeliveryEmailParams): Promise<SendResult> {
  const preview = p.messagePreview
    ? `<blockquote style="margin: 24px 0; padding: 16px 20px; background-color: rgba(139, 111, 58, 0.08); border-left: 3px solid #8b6f3a; font-style: italic; color: #5c4d2e;">
         ${escapeHtml(p.messagePreview)}…
       </blockquote>`
    : ''

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Dear ${escapeHtml(p.recipientName)},</p>

    <p style="margin: 0 0 16px 0;">
      <strong>${escapeHtml(p.fromName)}</strong> left a message for you.
    </p>

    ${preview}

    <p style="margin: 0 0 16px 0;">
      You can view it whenever you're ready. There's no rush, and nothing is
      asked of you in return — just an offering, from one heart to another.
    </p>
  `

  const text = [
    `Dear ${p.recipientName},`,
    '',
    `${p.fromName} left a message for you.`,
    p.messagePreview ? `\n"${p.messagePreview}..."\n` : '',
    `Read it here: ${p.viewUrl}`,
    '',
    'There\'s no rush — open it when you\'re ready.',
  ].join('\n')

  return sendEmail({
    to: p.to,
    fromName: `${p.fromName} via ReadyWithLove`,
    subject: `${p.fromName} left a message for you`,
    html: emailLayout({
      title: `A message from ${p.fromName}`,
      preheader: `${p.fromName} left a message for you on ReadyWithLove.`,
      bodyHtml,
      ctaLabel: 'Read the message',
      ctaUrl: p.viewUrl,
    }),
    text,
  })
}
