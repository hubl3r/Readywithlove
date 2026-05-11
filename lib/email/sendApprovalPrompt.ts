// lib/email/sendApprovalPrompt.ts
import { sendEmail, type SendResult } from '../resend'
import { emailLayout, escapeHtml } from './layout'

export interface ApprovalPromptParams {
  to: string                      // user's email
  userFirstName: string
  recipientName: string
  triggerDateLabel: string        // formatted "Friday, May 15"
  approvalUrl: string             // /api/messages/[id]/approve?token=...
  postponeUrl: string             // /dashboard/messages/[id]/edit (focus date field)
  cancelUrl: string               // /api/messages/[id]/archive?token=...
  viewUrl: string                 // /dashboard/messages/[id]
  isReminder?: boolean            // true for days 2..14
  daysSincePrompt?: number
}

export async function sendApprovalPrompt(p: ApprovalPromptParams): Promise<SendResult> {
  const reminderLine = p.isReminder
    ? `<p style="margin: 0 0 16px 0; font-style: italic; color: #8b6f3a;">
         (This is reminder day ${p.daysSincePrompt} of 14. If we don't hear back, we'll go ahead and send it on day 14 as you originally scheduled.)
       </p>`
    : ''

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Dear ${escapeHtml(p.userFirstName)},</p>

    <p style="margin: 0 0 16px 0;">
      A message you scheduled is ready for delivery to
      <strong>${escapeHtml(p.recipientName)}</strong> on
      <strong>${escapeHtml(p.triggerDateLabel)}</strong>.
    </p>

    ${reminderLine}

    <p style="margin: 0 0 16px 0;">
      You can review the message and decide what to do next. If you don't reply
      within 14 days, we'll trust that the scheduled delivery still stands and
      send it as planned.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
      <tr>
        <td style="padding-right: 12px;">
          <a href="${p.viewUrl}" style="display: inline-block; font-family: Georgia, serif; color: #f5f1e8; background-color: #2c2416; text-decoration: none; padding: 12px 24px; font-size: 13px; letter-spacing: 0.2em; text-transform: uppercase;">
            Review the message
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 24px 0 8px 0; font-size: 14px; color: #5c4d2e;">
      Or take action directly:
    </p>
    <ul style="margin: 0; padding: 0; list-style: none; font-size: 14px;">
      <li style="margin: 0 0 6px 0;">
        <a href="${p.approvalUrl}" style="color: #8b6f3a;">→ Send it as scheduled</a>
      </li>
      <li style="margin: 0 0 6px 0;">
        <a href="${p.postponeUrl}" style="color: #8b6f3a;">→ Push the date back</a>
      </li>
      <li style="margin: 0;">
        <a href="${p.cancelUrl}" style="color: #8b6f3a;">→ Cancel and archive</a>
      </li>
    </ul>
  `

  const text = [
    `Dear ${p.userFirstName},`,
    '',
    `A message you scheduled is ready for delivery to ${p.recipientName} on ${p.triggerDateLabel}.`,
    p.isReminder ? `(Reminder day ${p.daysSincePrompt} of 14.)` : '',
    '',
    'If you don\'t reply within 14 days, we\'ll send it as planned.',
    '',
    `Review: ${p.viewUrl}`,
    `Send now: ${p.approvalUrl}`,
    `Postpone: ${p.postponeUrl}`,
    `Cancel:   ${p.cancelUrl}`,
  ].filter(Boolean).join('\n')

  return sendEmail({
    to: p.to,
    subject: p.isReminder
      ? `Reminder: your message to ${p.recipientName} awaits`
      : `Your message to ${p.recipientName} is ready to send`,
    html: emailLayout({
      title: p.isReminder ? 'A gentle reminder' : 'A message awaits your review',
      preheader: `Your scheduled message to ${p.recipientName} is ready.`,
      bodyHtml,
    }),
    text,
  })
}
