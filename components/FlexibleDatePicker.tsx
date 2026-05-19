// components/FlexibleDatePicker.tsx
'use client'

/**
 * A three-dropdown date picker that allows year-only, year+month, or
 * full year+month+day selection. For ReadyWithLove timeline milestones,
 * users often remember "sometime in 1975" but not the exact date —
 * this lets them save what they know now and refine later.
 *
 * Output format (ISO-compatible date string):
 *   - Year-only:        "1975-01-01" (defaults Jan 1)
 *   - Year+month:       "1975-06-01" (defaults day 1)
 *   - Full:             "1975-06-15"
 *
 * Also reports precision (`year` | `month` | `day`) so consumers can
 * choose to display "1975" or "June 1975" or "June 15, 1975".
 * For now precision is encoded by inference — day=1 + month=1 means
 * "year-only" was probably picked. That's good enough until we add
 * a `datePrecision` column to the schema (deferred to a later zip).
 */

interface FlexibleDatePickerProps {
  value: string // ISO yyyy-mm-dd
  onChange: (next: string) => void
  required?: boolean
  minYear?: number
  maxYear?: number
  className?: string
}

const MONTHS = [
  { num: 1, label: 'January' },
  { num: 2, label: 'February' },
  { num: 3, label: 'March' },
  { num: 4, label: 'April' },
  { num: 5, label: 'May' },
  { num: 6, label: 'June' },
  { num: 7, label: 'July' },
  { num: 8, label: 'August' },
  { num: 9, label: 'September' },
  { num: 10, label: 'October' },
  { num: 11, label: 'November' },
  { num: 12, label: 'December' },
]

function daysInMonth(year: number, month: number): number {
  // month is 1-indexed
  return new Date(year, month, 0).getDate()
}

function parseISODate(value: string): { year: number | null; month: number | null; day: number | null } {
  if (!value) return { year: null, month: null, day: null }
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return { year: null, month: null, day: null }
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
  }
}

function formatISO(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

export function FlexibleDatePicker({
  value,
  onChange,
  required = false,
  minYear = 1900,
  maxYear,
  className = '',
}: FlexibleDatePickerProps) {
  const thisYear = new Date().getFullYear()
  const yearCap = maxYear ?? thisYear + 5

  // Build years descending (most recent first — most timeline milestones
  // are recent enough that this saves scrolling)
  const years: number[] = []
  for (let y = yearCap; y >= minYear; y--) years.push(y)

  const parsed = parseISODate(value)

  const handleYearChange = (yearStr: string) => {
    if (!yearStr) {
      // Clearing year clears the whole value
      onChange('')
      return
    }
    const year = Number(yearStr)
    const month = parsed.month ?? 1
    const day = parsed.day ?? 1
    onChange(formatISO(year, month, Math.min(day, daysInMonth(year, month))))
  }

  const handleMonthChange = (monthStr: string) => {
    if (!parsed.year) return
    if (!monthStr) {
      // Clearing month defaults to January 1st of the chosen year
      onChange(formatISO(parsed.year, 1, 1))
      return
    }
    const month = Number(monthStr)
    const day = parsed.day ?? 1
    onChange(formatISO(parsed.year, month, Math.min(day, daysInMonth(parsed.year, month))))
  }

  const handleDayChange = (dayStr: string) => {
    if (!parsed.year || !parsed.month) return
    if (!dayStr) {
      // Clearing day defaults to the 1st of the chosen month
      onChange(formatISO(parsed.year, parsed.month, 1))
      return
    }
    const day = Number(dayStr)
    onChange(formatISO(parsed.year, parsed.month, day))
  }

  const days: number[] = []
  if (parsed.year && parsed.month) {
    for (let d = 1; d <= daysInMonth(parsed.year, parsed.month); d++) days.push(d)
  }

  const selectClass =
    'bg-transparent border-b border-[#2c2416]/30 focus:border-[#8b6f3a] outline-none py-2 text-base md:text-lg font-serif text-[#2c2416]'

  return (
    <div className={`grid grid-cols-3 gap-3 ${className}`}>
      <select
        value={parsed.year ?? ''}
        onChange={(e) => handleYearChange(e.target.value)}
        required={required}
        className={selectClass}
        aria-label="Year"
      >
        <option value="">Year</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <select
        value={parsed.month ?? ''}
        onChange={(e) => handleMonthChange(e.target.value)}
        disabled={!parsed.year}
        className={selectClass + ' disabled:opacity-40'}
        aria-label="Month (optional)"
      >
        <option value="">Month (any)</option>
        {MONTHS.map((m) => (
          <option key={m.num} value={m.num}>
            {m.label}
          </option>
        ))}
      </select>

      <select
        value={parsed.day && parsed.day !== 1 ? parsed.day : ''}
        onChange={(e) => handleDayChange(e.target.value)}
        disabled={!parsed.year || !parsed.month}
        className={selectClass + ' disabled:opacity-40'}
        aria-label="Day (optional)"
      >
        <option value="">Day (any)</option>
        {days.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  )
}
