// components/ArrangementsView.tsx
//
// Zip 2d.1.2 — Cohesion pass.
//
// Changes from 2d.1:
//   - Background blobs + noise overlay match the Dashboard/home pattern.
//     The page felt like an island before; now it shares the room.
//   - Intro copy (B direction): "The kindest paperwork you'll ever do."
//     Frames the work as love instead of logistics.
//   - Optional final message card at the bottom — user writes a note to
//     whoever opens this section after they're gone. Stored on
//     Settings.arrFinalMessage. Empty by default, soft prompt to fill it.
//   - Tailwind font-serif/font-sans classes instead of inline fontFamily,
//     so the user's font-scale Setting actually drives the type size on
//     this page.
//
// Still client component — owns the toast, the accordion state, the
// final message editor state, and the framer-motion animations.

'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_ORDER,
  SEED_ITEMS,
  type ArrangementCategory,
} from '@/lib/arrangement-seeds'
import ArrangementItem, { type ArrangementRow } from '@/components/ArrangementItem'

type Props = {
  arrangements: ArrangementRow[]
  acks: Record<ArrangementCategory, boolean>
  finalMessage: string | null
}

function hintFor(category: string, title: string): string | undefined {
  return SEED_ITEMS.find((s) => s.category === category && s.title === title)
    ?.hint
}

export default function ArrangementsView({
  arrangements: initialArrangements,
  acks,
  finalMessage,
}: Props) {
  const [toast, setToast] = useState<string | null>(null)
  const [arrangements, setArrangements] =
    useState<ArrangementRow[]>(initialArrangements)
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const [openCategories, setOpenCategories] = useState<
    Record<ArrangementCategory, boolean>
  >({
    disposition: true,
    service: false,
    notifications: false,
    legal: false,
    wishes: false,
  })

  // Final message editor state. Starts in "view" mode if a message exists,
  // "edit" mode if it doesn't (gentle nudge to fill it in).
  const [fmDraft, setFmDraft] = useState(finalMessage ?? '')
  const [fmSavedValue, setFmSavedValue] = useState(finalMessage ?? '')
  const [fmEditing, setFmEditing] = useState(!finalMessage)
  const [fmSaving, setFmSaving] = useState(false)
  const [fmError, setFmError] = useState<string | null>(null)

  const byCategory = useMemo(() => {
    const map: Record<ArrangementCategory, ArrangementRow[]> = {
      disposition: [],
      service: [],
      notifications: [],
      legal: [],
      wishes: [],
    }
    for (const a of arrangements) {
      if ((CATEGORY_ORDER as string[]).includes(a.category)) {
        map[a.category as ArrangementCategory].push(a)
      }
    }
    return map
  }, [arrangements])

  const sectionsEngaged = useMemo(() => {
    return CATEGORY_ORDER.filter((cat) => {
      if (acks[cat]) return true
      return byCategory[cat].some((a) => a.status !== 'planned')
    }).length
  }, [acks, byCategory])

  const coreOutstanding = arrangements.filter(
    (a) => a.isCore && a.status === 'planned',
  ).length

  function toggleItem(id: string) {
    setOpenItemId((prev) => (prev === id ? null : id))
  }

  function handleSaved(updated: ArrangementRow) {
    setArrangements((prev) =>
      prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)),
    )
    setOpenItemId(null)
    setToast('Saved.')
    setTimeout(() => setToast(null), 1800)
  }

  function toggleCategory(cat: ArrangementCategory) {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }))
  }

  async function saveFinalMessage() {
    setFmSaving(true)
    setFmError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arrFinalMessage: fmDraft }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Could not save')
      }
      const trimmed = fmDraft.trim()
      setFmSavedValue(trimmed)
      setFmDraft(trimmed)
      setFmEditing(false)
    } catch (e) {
      setFmError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setFmSaving(false)
    }
  }

  function cancelFinalMessageEdit() {
    setFmDraft(fmSavedValue)
    setFmError(null)
    // If there's a saved value, drop back to view mode. If there isn't,
    // stay in edit mode — there's nothing to view.
    if (fmSavedValue) setFmEditing(false)
  }

  return (
    <>
      {/* -------------------- Background blobs -------------------- */}
      {/* Match the Dashboard pattern verbatim so this page sits in the
          same atmosphere as the rest of the app. */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{
            x: [0, 200, -50, 100, 0],
            y: [0, 150, 200, 50, 0],
            scale: [1, 1.3, 0.95, 1.1, 1],
          }}
          transition={{ duration: 50, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-40 -left-40 w-[500px] md:w-[800px] h-[500px] md:h-[800px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(139,111,58,0.18) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <motion.div
          animate={{
            x: [0, -150, 50, -100, 0],
            y: [0, 200, -50, 150, 0],
          }}
          transition={{ duration: 60, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 -right-40 w-[500px] md:w-[700px] h-[500px] md:h-[700px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(92,77,46,0.15) 0%, transparent 70%)',
            filter: 'blur(90px)',
          }}
        />
      </div>

      {/* Noise overlay — top of the stack but pointer-events-none so it
          doesn't eat clicks. */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-12 md:py-16">
        {/* -------------------- Intro (B direction) -------------------- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] uppercase text-[#8b6f3a] mb-3 md:mb-4">
            · vi. Arrangements ·
          </p>
          <h1 className="font-serif text-4xl md:text-6xl leading-[1.1] mb-6 md:mb-8 text-[#2c2416]">
            The kindest paperwork
            <br />
            <span className="italic text-[#8b6f3a]">you&rsquo;ll ever do.</span>
          </h1>
          <p className="font-sans text-lg leading-relaxed mb-3 text-[#5c4d2e]">
            What follows is the most administrative part of the app, and also
            the most loving. Every box you fill in is one fewer thing for
            someone to figure out while they&rsquo;re grieving you. Every
            prearrangement is a decision they don&rsquo;t have to second-guess
            at 2am.
          </p>
          <p className="font-sans text-sm leading-relaxed text-[#8b6f3a]">
            The will, if you have one, takes precedence over everything here.
            Anything you&rsquo;ve already arranged and paid for with a third
            party will stand. Everything else is guidance — your voice in the
            room when you can&rsquo;t be there.
          </p>
        </motion.div>

        {/* -------------------- Progress -------------------- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 mb-12 p-5 rounded-sm bg-[#8b6f3a]/[0.06] border border-[#8b6f3a]/15"
        >
          <div className="flex items-baseline justify-between mb-3">
            <span className="font-sans text-xs uppercase tracking-[0.2em] text-[#8b6f3a]">
              Where you are
            </span>
            <span className="font-sans text-sm text-[#5c4d2e]">
              {sectionsEngaged} of 5 sections
            </span>
          </div>
          <div className="h-[2px] w-full rounded-full overflow-hidden bg-[#8b6f3a]/15">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(sectionsEngaged / 5) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="h-full bg-[#8b6f3a]"
            />
          </div>
          {coreOutstanding > 0 && (
            <p className="font-sans text-xs mt-4 leading-relaxed text-[#5c4d2e]">
              {coreOutstanding === 1
                ? 'One essential item is still waiting on you. It is marked below.'
                : `${coreOutstanding} essential items are still waiting on you. They are marked below.`}
            </p>
          )}
        </motion.div>

        {/* -------------------- Sections -------------------- */}
        <div className="space-y-6">
          {CATEGORY_ORDER.map((cat, sectionIdx) => {
            const items = byCategory[cat]
            const isOpen = openCategories[cat]
            const acknowledged = acks[cat]
            const sectionEngaged =
              acknowledged || items.some((a) => a.status !== 'planned')

            return (
              <motion.section
                key={cat}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 0.25 + sectionIdx * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="rounded-sm overflow-hidden bg-[#fbf8f0]/80 backdrop-blur-sm border border-[#8b6f3a]/20"
              >
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 transition-colors hover:bg-[#8b6f3a]/[0.04]"
                  aria-expanded={isOpen}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-sans text-xs tabular-nums text-[#8b6f3a]">
                        {String(sectionIdx + 1).padStart(2, '0')}
                      </span>
                      {sectionEngaged && (
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full bg-[#8b6f3a]"
                          aria-label="Section engaged"
                        />
                      )}
                    </div>
                    <h2 className="font-serif text-2xl md:text-3xl leading-tight text-[#2c2416]">
                      {CATEGORY_LABELS[cat]}
                    </h2>
                  </div>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="font-sans text-sm flex-shrink-0 text-[#8b6f3a]"
                    aria-hidden
                  >
                    ▾
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="px-6 pb-6">
                        <p className="font-sans text-sm leading-relaxed mb-6 pb-5 text-[#5c4d2e] border-b border-[#8b6f3a]/15">
                          {CATEGORY_DESCRIPTIONS[cat]}
                        </p>
                        <ul className="space-y-0">
                          {items.map((item, itemIdx) => (
                            <ArrangementItem
                              key={item.id}
                              item={item}
                              hint={hintFor(item.category, item.title)}
                              isLast={itemIdx === items.length - 1}
                              isOpen={openItemId === item.id}
                              onToggle={() => toggleItem(item.id)}
                              onSaved={handleSaved}
                            />
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            )
          })}
        </div>

        {/* -------------------- Final message -------------------- */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 rounded-sm overflow-hidden bg-[#fbf8f0]/80 backdrop-blur-sm border border-[#8b6f3a]/20"
        >
          <div className="px-6 py-5 border-b border-[#8b6f3a]/15">
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-[#8b6f3a] mb-2">
              · A note from you ·
            </p>
            <h2 className="font-serif text-2xl md:text-3xl leading-tight text-[#2c2416]">
              {fmSavedValue
                ? 'For whoever opens this'
                : 'If you\u2019d like to leave a few words'}
            </h2>
          </div>

          <div className="px-6 py-6">
            {!fmEditing && fmSavedValue ? (
              <>
                <p className="font-serif italic text-lg md:text-xl leading-relaxed text-[#2c2416] whitespace-pre-wrap">
                  {fmSavedValue}
                </p>
                <div className="mt-5 flex items-center justify-between">
                  <p className="font-sans text-xs text-[#8b6f3a]">
                    They&rsquo;ll see this at the top of the page when they open it.
                  </p>
                  <button
                    onClick={() => setFmEditing(true)}
                    className="font-sans text-xs uppercase tracking-[0.2em] text-[#8b6f3a] hover:text-[#2c2416] transition"
                  >
                    Edit
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="font-sans text-sm leading-relaxed mb-5 text-[#5c4d2e]">
                  If you&rsquo;d like to leave a note to whoever opens this — what
                  you&rsquo;d want them to know before they start — write it here.
                  You can change it any time.
                </p>
                <textarea
                  value={fmDraft}
                  onChange={(e) => setFmDraft(e.target.value)}
                  placeholder="Something for the person reading this…"
                  rows={6}
                  className="w-full font-serif italic text-lg leading-relaxed p-4 rounded-sm bg-[#f5f1e8] border border-[#8b6f3a]/25 text-[#2c2416] placeholder:not-italic placeholder:font-sans placeholder:text-sm placeholder:text-[#8b6f3a]/60 focus:outline-none focus:border-[#8b6f3a]"
                />
                {fmError && (
                  <p className="font-sans text-xs mt-2 text-[#c0392b]">
                    {fmError}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-end gap-3">
                  {fmSavedValue && (
                    <button
                      onClick={cancelFinalMessageEdit}
                      disabled={fmSaving}
                      className="font-sans text-xs uppercase tracking-[0.2em] text-[#8b6f3a] hover:text-[#2c2416] transition disabled:opacity-40"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={saveFinalMessage}
                    disabled={fmSaving || fmDraft.trim() === fmSavedValue}
                    className="font-sans text-xs uppercase tracking-[0.2em] px-4 py-2 rounded-sm bg-[#2c2416] text-[#f5f1e8] hover:bg-[#8b6f3a] transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {fmSaving ? 'Saving…' : fmSavedValue ? 'Save changes' : 'Save'}
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.section>

        {/* -------------------- Footer note -------------------- */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="font-sans text-xs text-center mt-12 leading-relaxed text-[#8b6f3a]"
        >
          Nothing here is shared with anyone yet. When the time comes, your
          executor will see what you choose to leave them.
        </motion.p>
      </main>

      {/* -------------------- Toast -------------------- */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-3 rounded-sm shadow-lg bg-[#2c2416] text-[#f5f1e8] font-sans text-sm z-[60]"
            role="status"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
