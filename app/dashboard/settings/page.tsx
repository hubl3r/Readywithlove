// app/dashboard/settings/page.tsx
'use client'

import { motion } from 'motion/react'
import { useState, useEffect } from 'react'
import { AppNav } from '@/components/AppNav'
import { rankVoices, waitForVoices } from '@/lib/voicePicker'
import { speak, stopSpeaking } from '@/lib/speech'

interface Settings {
  pageTurnStyle: 'fade' | 'curl'
  fontScale: 'small' | 'normal' | 'large' | 'xlarge'
  highContrast: boolean
  ttsEnabled: boolean
  sttEnabled: boolean
  reducedMotion: boolean
  preferredVoiceURI: string | null
  notifyOnContribution: boolean
}

const FONT_SCALES: { id: Settings['fontScale']; label: string; size: string }[] = [
  { id: 'small', label: 'Small', size: 'text-sm' },
  { id: 'normal', label: 'Normal', size: 'text-base' },
  { id: 'large', label: 'Large', size: 'text-lg' },
  { id: 'xlarge', label: 'Extra Large', size: 'text-xl' },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data && setSettings(data))
  }, [])

  const update = async (patch: Partial<Settings>) => {
    if (!settings) return
    const next = { ...settings, ...patch }
    setSettings(next)
    setSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      setSavedAt(Date.now())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#2c2416] relative overflow-x-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{ x: [0, 200, 0], y: [0, 150, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 50, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-40 -left-40 w-[500px] md:w-[800px] h-[500px] md:h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,111,58,0.18) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      {/* Grain overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <AppNav />

      <main className="relative z-10 max-w-[800px] mx-auto px-5 md:px-12 py-10 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-10 md:mb-16"
        >
          <p className="text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] uppercase text-[#8b6f3a] mb-3 md:mb-4">
            · Preferences ·
          </p>
          <h1 className="font-serif text-4xl md:text-6xl leading-tight mb-3 md:mb-4">
            Make it yours,
            <br />
            <span className="italic text-[#8b6f3a]">your way.</span>
          </h1>
          <p className="text-base md:text-lg text-[#5c4d2e] font-light max-w-xl">
            Adjust how the experience looks, sounds, and moves. Every change saves
            automatically.
          </p>
          {savedAt && (
            <p className="mt-4 text-xs italic text-[#8b6f3a]">
              {saving ? 'saving…' : '✓ saved'}
            </p>
          )}
        </motion.div>

        {!settings ? (
          <p className="italic text-[#5c4d2e]">Loading…</p>
        ) : (
          <div className="space-y-10 md:space-y-14">
            {/* Page turn style */}
            <Section title="Album page turns" caption="How pages move when you read your story">
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <Card
                  active={settings.pageTurnStyle === 'fade'}
                  onClick={() => update({ pageTurnStyle: 'fade' })}
                  title="Fade"
                  desc="A soft slide between pages. Subtle and quiet."
                />
                <Card
                  active={settings.pageTurnStyle === 'curl'}
                  onClick={() => update({ pageTurnStyle: 'curl' })}
                  title="Curl"
                  desc="A 3D page turn, like a real album."
                />
              </div>
            </Section>

            {/* Font scale */}
            <Section title="Text size" caption="Make the writing larger or smaller">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {FONT_SCALES.map((opt) => (
                  <Card
                    key={opt.id}
                    active={settings.fontScale === opt.id}
                    onClick={() => update({ fontScale: opt.id })}
                    title={opt.label}
                    desc={
                      <span className={`${opt.size} font-serif italic`}>Aa</span>
                    }
                  />
                ))}
              </div>
            </Section>

            {/* Toggles */}
            <Section title="Accessibility" caption="Tools to make the experience comfortable">
              <div className="space-y-3">
                <Toggle
                  label="High contrast"
                  desc="Stronger colors and bolder edges, easier on tired eyes."
                  on={settings.highContrast}
                  onChange={(v) => update({ highContrast: v })}
                />
                <Toggle
                  label="Read aloud"
                  desc="Have stories and messages spoken to you (text-to-speech)."
                  on={settings.ttsEnabled}
                  onChange={(v) => update({ ttsEnabled: v })}
                />
                <Toggle
                  label="Speak to write"
                  desc="Dictate your stories instead of typing (speech-to-text)."
                  on={settings.sttEnabled}
                  onChange={(v) => update({ sttEnabled: v })}
                />
                <Toggle
                  label="Reduced motion"
                  desc="Calmer animations across the site."
                  on={settings.reducedMotion}
                  onChange={(v) => update({ reducedMotion: v })}
                />
              </div>
            </Section>

            {/* Zip 2c.3 — voice picker. Only useful when read-aloud is on,
                but shown unconditionally so users can audition voices before
                turning the feature on. */}
            <Section title="Reading voice" caption="Pick how stories sound">
              <VoicePicker
                preferredVoiceURI={settings.preferredVoiceURI}
                onChange={(uri) => update({ preferredVoiceURI: uri })}
              />
            </Section>

            {/* Zip 2c.6 — notification preferences. Email-only for now; the
                in-app unread dot in AppNav is always on. */}
            <Section title="Notifications" caption="When to hear from us by email">
              <div className="space-y-3">
                <Toggle
                  label="New contributions"
                  desc="Email me when someone shares a memory with me. (Multiple submissions from the same contributor within 15 minutes count as one email.)"
                  on={settings.notifyOnContribution}
                  onChange={(v) => update({ notifyOnContribution: v })}
                />
              </div>
            </Section>
          </div>
        )}
      </main>
    </div>
  )
}

function Section({
  title,
  caption,
  children,
}: {
  title: string
  caption: string
  children: React.ReactNode
}) {
  return (
    <section>
      <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-2">
        {caption}
      </p>
      <h2 className="font-serif text-2xl md:text-3xl mb-5 md:mb-6">{title}</h2>
      {children}
    </section>
  )
}

function Card({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean
  onClick: () => void
  title: string
  desc: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 md:p-5 border transition ${
        active
          ? 'border-[#8b6f3a] bg-[#8b6f3a]/10'
          : 'border-[#2c2416]/15 hover:border-[#8b6f3a]/50 bg-[#f5f1e8]/40'
      }`}
    >
      <p
        className={`font-serif text-lg md:text-xl mb-1 ${
          active ? 'text-[#8b6f3a]' : 'text-[#2c2416]'
        }`}
      >
        {title}
      </p>
      <p className="text-xs md:text-sm text-[#5c4d2e] font-light">{desc}</p>
    </button>
  )
}

function Toggle({
  label,
  desc,
  on,
  onChange,
}: {
  label: string
  desc: string
  on: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 md:p-5 border border-[#2c2416]/15 bg-[#f5f1e8]/40">
      <div className="flex-1">
        <p className="font-serif text-base md:text-lg">{label}</p>
        <p className="text-xs md:text-sm text-[#5c4d2e] font-light mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!on)}
        role="switch"
        aria-checked={on}
        className={`relative w-12 h-6 md:w-14 md:h-7 rounded-full shrink-0 transition ${
          on ? 'bg-[#8b6f3a]' : 'bg-[#2c2416]/20'
        }`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`absolute top-0.5 w-5 h-5 md:w-6 md:h-6 bg-[#f5f1e8] rounded-full shadow ${
            on ? 'right-0.5' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}

/**
 * Voice picker. Loads voices async (browser quirk) and ranks them so the
 * good ones float to the top. "Auto" is the default option — equivalent
 * to storing null preferredVoiceURI, which makes pickVoice() return the
 * highest-ranked available voice at speak time.
 *
 * Includes a preview button so users can audition the selected voice
 * before committing.
 */
function VoicePicker({
  preferredVoiceURI,
  onChange,
}: {
  preferredVoiceURI: string | null
  onChange: (uri: string | null) => void
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [loading, setLoading] = useState(true)
  const [previewing, setPreviewing] = useState(false)

  useEffect(() => {
    let cancelled = false
    waitForVoices().then((list) => {
      if (cancelled) return
      setVoices(rankVoices(list))
      setLoading(false)
    })
    return () => {
      cancelled = true
      stopSpeaking()
    }
  }, [])

  const handlePreview = async () => {
    if (previewing) {
      stopSpeaking()
      setPreviewing(false)
      return
    }
    setPreviewing(true)
    await speak({
      text:
        'This is how stories will sound. The light comes in through the window like it always has.',
      preferredVoiceURI,
      onEnd: () => setPreviewing(false),
      onError: () => setPreviewing(false),
    })
  }

  if (loading) {
    return (
      <p className="font-serif italic text-[#5c4d2e]">Loading voices…</p>
    )
  }

  if (voices.length === 0) {
    return (
      <p className="font-serif italic text-[#5c4d2e]">
        No voices were found in your browser. Read-aloud may not work on this device.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 p-4 md:p-5 border border-[#2c2416]/15 bg-[#f5f1e8]/40">
        <div className="flex-1">
          <label
            className="block font-serif text-base md:text-lg mb-1"
            htmlFor="voice-select"
          >
            Voice
          </label>
          <p className="text-xs md:text-sm text-[#5c4d2e] font-light mb-3">
            Auto picks the most natural-sounding voice your browser has.
          </p>
          <select
            id="voice-select"
            value={preferredVoiceURI ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            className="w-full bg-[#f5f1e8] border border-[#2c2416]/30 focus:border-[#8b6f3a] outline-none px-3 py-2 font-serif text-base text-[#2c2416]"
          >
            <option value="">Auto (best available)</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} {v.default ? '(system default)' : ''}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handlePreview}
          className="shrink-0 px-4 py-2 border border-[#2c2416]/30 hover:border-[#2c2416] transition text-[10px] tracking-[0.2em] uppercase mt-7"
        >
          {previewing ? '■ Stop' : '▶ Preview'}
        </button>
      </div>
      <p className="text-[10px] italic text-[#5c4d2e]/60">
        Available voices depend on your browser and operating system. Apple
        &ldquo;Enhanced&rdquo; voices, Microsoft &ldquo;Online (Natural)&rdquo; voices, and
        Google voices tend to sound the most natural.
      </p>
    </div>
  )
}
