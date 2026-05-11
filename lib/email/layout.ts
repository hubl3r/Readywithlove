// lib/email/layout.ts
//
// Shared HTML wrapper for transactional emails. Matches the cream/bronze
// editorial aesthetic. Inline styles only — email clients don't reliably
// support <style> tags or external CSS.

export interface LayoutOptions {
  title: string                // shown in the email body, not subject
  preheader?: string           // hidden preview text shown in inbox lists
  bodyHtml: string             // already-rendered body content
  ctaLabel?: string
  ctaUrl?: string
}

const CREAM = '#f5f1e8'
const DEEP = '#2c2416'
const BRONZE = '#8b6f3a'
const BODY = '#5c4d2e'

export function emailLayout(opts: LayoutOptions): string {
  const { title, preheader, bodyHtml, ctaLabel, ctaUrl } = opts

  const cta =
    ctaLabel && ctaUrl
      ? `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
          <tr>
            <td style="background-color: ${DEEP}; padding: 14px 28px;">
              <a href="${ctaUrl}" style="font-family: Georgia, 'Cormorant Garamond', serif; color: ${CREAM}; text-decoration: none; font-size: 14px; letter-spacing: 0.2em; text-transform: uppercase;">
                ${ctaLabel}
              </a>
            </td>
          </tr>
        </table>
      `
      : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${CREAM}; font-family: Georgia, 'Cormorant Garamond', serif; color: ${DEEP};">
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${escapeHtml(preheader)}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${CREAM};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width: 560px; background-color: ${CREAM};">

          <!-- Header -->
          <tr>
            <td style="padding-bottom: 32px; border-bottom: 1px solid rgba(44, 36, 22, 0.15);">
              <p style="margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; font-size: 28px; color: ${DEEP};">
                Ready
                <span style="display: inline-block; width: 24px; height: 1px; background-color: ${DEEP}; vertical-align: middle; margin: 0 8px;"></span>
                <span style="font-style: normal; font-size: 14px; letter-spacing: 0.3em; text-transform: uppercase; color: ${BODY};">with love</span>
              </p>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding-top: 40px;">
              <h1 style="margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 36px; font-weight: 400; line-height: 1.2; color: ${DEEP};">
                ${escapeHtml(title)}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 24px 0; font-family: Georgia, serif; font-size: 16px; line-height: 1.65; color: ${BODY};">
              ${bodyHtml}
              ${cta}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 40px; border-top: 1px solid rgba(44, 36, 22, 0.15); font-family: Georgia, serif; font-size: 12px; line-height: 1.6; color: ${BRONZE};">
              <p style="margin: 0 0 8px 0; font-style: italic;">
                This inbox is not monitored. For support, visit
                <a href="https://www.readywithlove.com/support" style="color: ${BRONZE};">readywithlove.com/support</a>.
              </p>
              <p style="margin: 0;">
                ReadyWithLove · A place for the things only you can say.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Re-export so email files can use it without a second import line.
export { escapeHtml }
