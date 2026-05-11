// lib/dateFormat.ts
//
// Centralized date formatting helpers. The HTML <input type="date"> gives us
// 'YYYY-MM-DD' strings (no time, no zone). When stored as a Postgres Date
// or sent through JSON, it becomes a Date object that JavaScript interprets
// based on whether it has time/zone info.
//
// THE TRAP:
//   new Date('2026-05-11')          → 2026-05-11T00:00:00Z (UTC midnight)
//   That's 7pm on 2026-05-10 in Central Time. So .toLocaleDateString()
//   shows May 10 instead of May 11 — off by one day.
//
// THE FIX:
//   Parse 'YYYY-MM-DD' as local-time noon. Noon is always the same day in
//   every timezone, no matter the user's offset, so formatting never shifts.

/**
 * Parse a 'YYYY-MM-DD' date string (or an ISO datetime) into a Date object
 * that represents noon in the user's local timezone on the intended day.
 *
 * Accepts:
 *   - 'YYYY-MM-DD'                        (from <input type="date">)
 *   - 'YYYY-MM-DDTHH:mm:ss.sssZ'          (from Prisma JSON serialization)
 *   - Any other Date-parseable string     (passed through to new Date())
 */
export function parseDateString(input: string | Date | null | undefined): Date | null {
  if (!input) return null
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input

  // Detect bare YYYY-MM-DD format
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input)
  if (dateOnly) {
    const [, y, m, d] = dateOnly
    // Use noon local so formatting in any zone returns this calendar day
    return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0)
  }

  // Full ISO from DB — Prisma returns 'YYYY-MM-DDTHH:mm:ss.sssZ' which
  // gets parsed as UTC. For date-only fields that were originally entered
  // as 'YYYY-MM-DD' (and stored as UTC midnight), we want to extract the
  // intended calendar day. Take the UTC year/month/day and rebuild at
  // local noon.
  const isoUtc = /^(\d{4})-(\d{2})-(\d{2})T/.exec(input)
  if (isoUtc) {
    const [, y, m, d] = isoUtc
    return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0)
  }

  // Last resort
  const fallback = new Date(input)
  return isNaN(fallback.getTime()) ? null : fallback
}

/**
 * Format a date for prominent display: "Friday, May 15, 2026"
 */
export function formatLongDate(input: string | Date | null | undefined): string {
  const d = parseDateString(input)
  if (!d) return ''
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format a date for inline display: "May 15, 2026"
 */
export function formatMediumDate(input: string | Date | null | undefined): string {
  const d = parseDateString(input)
  if (!d) return ''
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Convert a Date back to 'YYYY-MM-DD' for putting into <input type="date">
 */
export function toDateInputValue(input: string | Date | null | undefined): string {
  const d = parseDateString(input)
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
