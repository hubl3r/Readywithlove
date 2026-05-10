// app/dashboard/settings/page.tsx
'use client'

import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { motion } from 'motion/react'
import { useState, useEffect } from 'react'

interface Settings {
  pageTurnStyle: 'fade' | 'curl'
  fontScale: 'small' | 'normal' | 'large' | 'xlarge'
  highContrast: boolean
  ttsEnabled: boolean
  sttEnabled: boolean
  reducedMotion: boolean
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

      <nav className="relative z-10 flex justify-between items-center px-5 md:px-12 py-5 md:py-8 max-w-[1400px] mx-auto gap-3 border-b border-[#2c2416]/10">
        <Link href="/" className="flex items-baseline gap-2 md:gap-3 min-w-0 hover:opacity-80 transition">
          <span className="text-xl md:text-3xl font-serif italic tracking-tight">Ready</span>
          <span className="h-px w-6 bg-[#2c2416] hidden sm:block"></span>
          <span className="text-[10px] md:text-xl tracking-[0.2em] md:tracking-[0.3em] uppercase text-[#5c4d2e] truncate">
            with love
          </span>
        </Link>
        <div className="flex items-center gap-4 md:gap-6">
          <Link
            href="/dashboard"
            className="text-[10px] md:text-sm tracking-widest uppercase hover:text-[#8b6f3a] transition"
          >
            ← Dashboard
          </Link>
          <UserButton />
        </div>
      </nav>

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
