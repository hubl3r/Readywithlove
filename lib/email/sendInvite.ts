// lib/email/sendInvite.ts
import { sendEmail, type SendResult } from '../resend'
import { emailLayout, escapeHtml } from './layout'

export interface InviteEmailParams {
  to: string
  contributorName: string
  inviterName: string             // the user who's inviting (their display name)
  personalMessage?: string        // optional note from inviter
  inviteUrl: string               // /contribute/[token]
  expiresAt: Date
}

export async function sendInviteEmail(p: InviteEmailParams): Promise<SendResult> {
  const expiresStr = p.expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const personalNote = p.personalMessage
    ? `<blockquote style="margin: 24px 0; padding: 16px 20px; background-color: rgba(139, 111, 58, 0.08); border-left: 3px solid #8b6f3a; font-style: italic; color: #5c4d2e;">
         ${escapeHtml(p.personalMessage)}
       </blockquote>`
    : ''

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Dear ${escapeHtml(p.contributorName)},</p>

    <p style="margin: 0 0 16px 0;">
      ${escapeHtml(p.inviterName)} has invited you to share a memory, a story, or a message
      that they can carry forward. It might be a birthday wish for them to read this year,
      a memory you'd like preserved, or simply a few words you've always wanted to say.
    </p>

    ${personalNote}

    <p style="margin: 0 0 16px 0;">
      You can record a short video, write a letter, or share a photo. Whatever feels right.
      No account needed — just click the link below.
    </p>

    <p style="margin: 0 0 8px 0; font-size: 13px; font-style: italic; color: #8b6f3a;">
      This invitation expires on ${escapeHtml(expiresStr)}.
    </p>
  `

  const text = [
    `Dear ${p.contributorName},`,
    '',
    `${p.inviterName} has invited you to share a memory, story, or message on ReadyWithLove.`,
    p.personalMessage ? `\n${p.inviterName} wrote: "${p.personalMessage}"\n` : '',
    `You can contribute a video, letter, or photo at: ${p.inviteUrl}`,
    '',
    `This invitation expires on ${expiresStr}.`,
    '',
    'No account needed.',
    '— ReadyWithLove',
  ].join('\n')

  return sendEmail({
    to: p.to,
    subject: `${p.inviterName} would like to hear from you`,
    fromName: `${p.inviterName} via ReadyWithLove`,
    html: emailLayout({
      title: 'An invitation to share a memory',
      preheader: `${p.inviterName} invited you to contribute to their story.`,
      bodyHtml,
      ctaLabel: 'Share a memory',
      ctaUrl: p.inviteUrl,
    }),
    text,
  })
}
