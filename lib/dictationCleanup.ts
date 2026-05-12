// lib/dictationCleanup.ts
//
// Convert spoken punctuation words into actual punctuation marks. Browsers'
// built-in SpeechRecognition doesn't auto-punctuate on most platforms, but
// most users naturally say "comma" or "period" when they want one. This
// runs on the raw transcript chunk before it's appended.
//
// Rules:
//   - Match standalone words only (word boundaries) so "compound" doesn't
//     get treated as "com pound" or similar.
//   - Case-insensitive — users may say it capitalized at sentence start.
//   - Run sequentially so "period new paragraph" → ". \n\n".
//   - Collapse whitespace before punctuation so we don't get "word ."

interface SpokenRule {
  /** Word(s) the user might say. All matched as standalone words. */
  patterns: RegExp[]
  /** Replacement string */
  replacement: string
  /** Whether to trim trailing whitespace BEFORE the punctuation
   *  (e.g. "word ," → "word,") */
  trimLeadingSpace?: boolean
}

const RULES: SpokenRule[] = [
  // Sentence punctuation
  { patterns: [/\bperiod\b/gi, /\bfull stop\b/gi], replacement: '.', trimLeadingSpace: true },
  { patterns: [/\bcomma\b/gi],                     replacement: ',', trimLeadingSpace: true },
  { patterns: [/\bquestion mark\b/gi],             replacement: '?', trimLeadingSpace: true },
  { patterns: [/\bexclamation (mark|point)\b/gi],  replacement: '!', trimLeadingSpace: true },
  { patterns: [/\bsemicolon\b/gi],                 replacement: ';', trimLeadingSpace: true },
  { patterns: [/\bcolon\b/gi],                     replacement: ':', trimLeadingSpace: true },

  // Whitespace / structure
  { patterns: [/\bnew paragraph\b/gi, /\bnext paragraph\b/gi], replacement: '\n\n' },
  { patterns: [/\bnew line\b/gi, /\bnext line\b/gi],           replacement: '\n' },

  // Dashes
  { patterns: [/\b(em )?dash\b/gi],   replacement: '—' },
  { patterns: [/\bhyphen\b/gi],       replacement: '-' },

  // Quotation
  { patterns: [/\bopen quote\b/gi, /\bquote\b(?!d)/gi],      replacement: '"' },
  { patterns: [/\bclose quote\b/gi, /\bunquote\b/gi],         replacement: '"' },

  // Apostrophe — careful, we DON'T want to interpret "apostrophe" inside
  // a contraction discussion. Common enough this is fine.
  { patterns: [/\bapostrophe\b/gi], replacement: '\'' },
]

/**
 * Apply spoken-punctuation rules to a transcript chunk.
 *
 * Returns transformed text. Safe to call on already-clean input
 * (no-op when no spoken-punctuation words are present).
 */
export function applySpokenPunctuation(input: string): string {
  let out = input

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (rule.trimLeadingSpace) {
        // Match the word with any leading whitespace and replace with
        // just the punctuation (no leading space).
        const trimPattern = new RegExp('\\s*' + pattern.source, pattern.flags)
        out = out.replace(trimPattern, rule.replacement)
      } else {
        out = out.replace(pattern, rule.replacement)
      }
    }
  }

  // Tidy: ensure a single space after sentence-ending punctuation
  out = out.replace(/([.!?,;:])\s*/g, '$1 ')
  // ...but no trailing space at end
  out = out.replace(/\s+$/, '')
  // Collapse runs of plain spaces (but not newlines)
  out = out.replace(/ {2,}/g, ' ')
  // Capitalize the next sentence start after . ! ?
  out = out.replace(/([.!?]\s+)([a-z])/g, (_m, p, c) => p + c.toUpperCase())

  return out
}

/**
 * Capitalize the very first character (used after appending finalized chunks
 * to the running transcript). No-op if already capitalized.
 */
export function capitalizeFirst(input: string): string {
  if (!input) return input
  return input.charAt(0).toUpperCase() + input.slice(1)
}
