// lib/voicePicker.ts
//
// Picks the best available TTS voice from the browser's local list. The
// browser's "default" voice is often quite robotic on Windows and older
// Android. Most platforms ship at least one "Enhanced" / "Natural" /
// "Premium" / "Neural" voice that sounds dramatically better — they're
// just not the default.
//
// This module is purely client-side. SpeechSynthesisVoice isn't a real
// type on server.

/**
 * Score a voice for "naturalness." Higher = more preferred. Heuristics
 * based on commonly-shipped browser/OS voices in 2026.
 *
 * The score doesn't have to be precise — just enough to pick a good
 * default. Users can override via Settings.
 */
export function scoreVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase()
  const uri = (voice.voiceURI || '').toLowerCase()
  let score = 0

  // Strong positive signals for high-quality voices
  if (name.includes('natural') || uri.includes('natural')) score += 100
  if (name.includes('neural') || uri.includes('neural')) score += 100
  if (name.includes('premium') || uri.includes('premium')) score += 90
  if (name.includes('enhanced') || uri.includes('enhanced')) score += 80
  if (name.includes('online') || uri.includes('online')) score += 60

  // Microsoft "Online (Natural)" voices on Edge — very good
  if (name.includes('microsoft') && name.includes('online')) score += 30

  // Google voices (especially desktop Chrome) sound better than OS defaults
  if (name.startsWith('google ')) score += 40

  // Apple's "Enhanced" or premium Siri-derived voices
  if (uri.includes('com.apple.voice.enhanced') ||
      uri.includes('com.apple.voice.premium') ||
      uri.includes('com.apple.eloquence')) {
    score += 70
  }
  // Apple "compact" voices are the lowest tier — slight penalty
  if (uri.includes('com.apple.voice.compact')) score -= 10

  // Avoid voices that are clearly novelty / non-default-language
  if (name.match(/whisper|bells|cellos|organ|trinoids|hysterical|robot/i)) score -= 50

  // Prefer en-US over other English variants for our user base. (Easy to
  // flip later if we want to internationalize voice selection.)
  if (voice.lang === 'en-US') score += 10
  else if (voice.lang?.startsWith('en')) score += 5
  else score -= 20

  // Default-flagged voices get a small bump as a tiebreaker
  if (voice.default) score += 1

  return score
}

/**
 * Rank all available voices, highest score first. Filters out non-English
 * voices entirely (we can revisit when we localize).
 */
export function rankVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices
    .filter((v) => v.lang?.toLowerCase().startsWith('en'))
    .map((v) => ({ v, score: scoreVoice(v) }))
    .sort((a, b) => b.score - a.score)
    .map(({ v }) => v)
}

/**
 * Find the voice matching a stored voiceURI, falling back to the best
 * available if the stored one is no longer present (user changed
 * browsers, OS update removed the voice, etc.).
 */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  preferredVoiceURI: string | null | undefined
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null
  if (preferredVoiceURI) {
    const match = voices.find((v) => v.voiceURI === preferredVoiceURI)
    if (match) return match
  }
  const ranked = rankVoices(voices)
  return ranked[0] ?? voices[0] ?? null
}

/**
 * Browser voice loading is asynchronous on most engines. This helper
 * resolves once the voices list is non-empty (or after a short timeout
 * if the user has no voices installed at all — unusual but possible).
 */
export function waitForVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve([])
  }
  return new Promise((resolve) => {
    const initial = window.speechSynthesis.getVoices()
    if (initial.length > 0) {
      resolve(initial)
      return
    }
    let done = false
    const onChange = () => {
      const list = window.speechSynthesis.getVoices()
      if (list.length > 0 && !done) {
        done = true
        window.speechSynthesis.removeEventListener('voiceschanged', onChange)
        resolve(list)
      }
    }
    window.speechSynthesis.addEventListener('voiceschanged', onChange)
    window.setTimeout(() => {
      if (!done) {
        done = true
        window.speechSynthesis.removeEventListener('voiceschanged', onChange)
        resolve(window.speechSynthesis.getVoices())
      }
    }, timeoutMs)
  })
}
