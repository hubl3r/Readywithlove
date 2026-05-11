// lib/resend.ts
import { Resend } from 'resend'

export const RESEND_CONFIGURED = !!process.env.RESEND_API_KEY

// Centralized From address. Change here, not in every email file.
export const FROM_ADDRESS = 'notifications@readywithlove.com'
export const FROM_NAME_DEFAULT = 'ReadyWithLove'

export class ResendNotConfiguredError extends Error {
  constructor() {
    super(
      'Resend is not configured. Set RESEND_API_KEY in your environment.'
    )
    this.name = 'ResendNotConfiguredError'
  }
}

let _client: Resend | null = null
function client(): Resend {
  if (!RESEND_CONFIGURED) throw new ResendNotConfiguredError()
  if (!_client) _client = new Resend(process.env.RESEND_API_KEY)
  return _client
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string                  // plain-text fallback for accessibility
  fromName?: string              // overrides default ("ReadyWithLove")
  replyTo?: string               // we generally don't set this — see footer copy
}

export interface SendResult {
  id?: string
  skipped?: boolean              // true when Resend isn't configured (dev)
  error?: string
}

/**
 * Send a single email. Returns a result rather than throwing so callers can
 * decide how to handle failures (e.g. queue for retry, log, ignore).
 * In dev without RESEND_API_KEY this logs to console and returns skipped:true
 * so the rest of the flow keeps working.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<SendResult> {
  if (!RESEND_CONFIGURED) {
    console.log('[email:skipped]', {
      to: opts.to,
      subject: opts.subject,
      preview: opts.html.slice(0, 120),
    })
    return { skipped: true }
  }

  const fromName = opts.fromName ?? FROM_NAME_DEFAULT
  const from = `${fromName} <${FROM_ADDRESS}>`

  try {
    const { data, error } = await client().emails.send({
      from,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    })

    if (error) {
      console.error('[email:error]', error)
      return { error: error.message ?? 'unknown email error' }
    }
    return { id: data?.id }
  } catch (err) {
    console.error('[email:exception]', err)
    return { error: (err as Error).message }
  }
}
