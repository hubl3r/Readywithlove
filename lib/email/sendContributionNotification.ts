// lib/email/sendContributionNotification.ts
//
// Zip 2c.6: notifies the user when someone submits a contribution to one
// of their invites. Sent on submission, with 15-minute per-contributor
// dedupe (handled by the caller — this helper just sends).

import { sendEmail, type SendResult } from '../resend'
import { emailLayout, escapeHtml } from './layout'

export interface ContributionNotificationParams {
  to: string
  recipientName: string         // owner's display name
  contributorName: string       // person who submitted
  contributionType: 'letter' | 'video' | 'photo' | 'story'
  contributionPreview?: string  // first ~30 words for letter/story; literal for others
  dashboardUrl: string          // /dashboard/contributions
}

export async function sendContributionNotificationEmail(
  p: ContributionNotificationParams
): Promise<SendResult> {
  const typeLabel = (() => {
    switch (p.contributionType) {
      case 'video':  return 'a video'
      case 'photo':  return 'a photo'
      case 'story':  return 'a story'
      case 'letter':
      default:       return 'a letter'
    }
  })()

  const previewBlock = p.contributionPreview
    ? `<blockquote style="margin: 24px 0; padding: 16px 20px; background-color: rgba(139, 111, 58, 0.08); border-left: 3px solid #8b6f3a; font-style: italic; color: #5c4d2e;">
         ${escapeHtml(p.contributionPreview)}
         ${p.contributionPreview.length >= 200 ? '…' : ''}
       </blockquote>`
    : ''

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Dear ${escapeHtml(p.recipientName)},</p>

    <p style="margin: 0 0 16px 0;">
      <strong>${escapeHtml(p.contributorName)}</strong> just shared ${typeLabel} with you
      through ReadyWithLove.
    </p>

    ${previewBlock}

    <p style="margin: 0 0 16px 0;">
      You can view it any time in your shoebox of memories from others.
    </p>
  `

  const text = [
    `Dear ${p.recipientName},`,
    '',
    `${p.contributorName} just shared ${typeLabel} with you through ReadyWithLove.`,
    p.contributionPreview ? `\n"${p.contributionPreview}"\n` : '',
    `View it here: ${p.dashboardUrl}`,
    '',
    '— ReadyWithLove',
  ].join('\n')

  return sendEmail({
    to: p.to,
    subject: `${p.contributorName} shared a memory with you`,
    fromName: 'ReadyWithLove',
    html: emailLayout({
      title: 'A new memory has arrived',
      preheader: `${p.contributorName} shared ${typeLabel} with you.`,
      bodyHtml,
      ctaLabel: 'View in your shoebox',
      ctaUrl: p.dashboardUrl,
    }),
    text,
  })
}
