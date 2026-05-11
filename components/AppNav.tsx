// components/AppNav.tsx
'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { UserButton } from '@clerk/nextjs'

interface NavItem {
  num: string         // roman numeral
  label: string
  href: string
  available: boolean  // false → grayed out, "coming soon"
}

// Order matches the chapter sequence in the dashboard cards. Update the
// `available` flag as each zip ships.
const ITEMS: NavItem[] = [
  { num: 'i.',   label: 'Dashboard',    href: '/dashboard',              available: true  },
  { num: 'ii.',  label: 'Timeline',     href: '/dashboard/timeline',     available: true  },
  { num: 'iii.', label: 'Messages',     href: '/dashboard/messages',     available: true  },
  { num: 'iv.',  label: 'Contacts',     href: '/dashboard/contacts',     available: false },
  { num: 'v.',   label: 'Arrangements', href: '/dashboard/arrangements', available: false },
  { num: 'vi.',  label: 'Vault',        href: '/dashboard/vault',        available: false },
  { num: 'vii.', label: 'Executor',     href: '/dashboard/executor',     available: false },
]

export function AppNav() {
  const [open, setOpen] = useState(false)

  // Close on Escape, and lock body scroll while open
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <nav className="relative z-30 flex justify-between items-center px-5 md:px-12 py-5 md:py-8 max-w-[1400px] mx-auto gap-3 border-b border-[#2c2416]/10">
        {/* Left: hamburger + brand */}
        <div className="flex items-center gap-4 md:gap-6 min-w-0">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="group w-10 h-10 flex flex-col justify-center items-center gap-1.5 -ml-1 hover:opacity-70 transition"
          >
            <span className="block w-6 h-px bg-[#2c2416] transition group-hover:w-7" />
            <span className="block w-6 h-px bg-[#2c2416] transition" />
            <span className="block w-6 h-px bg-[#2c2416] transition group-hover:w-4" />
          </button>

          <Link
            href="/"
            className="flex items-baseline gap-2 md:gap-3 min-w-0 hover:opacity-80 transition"
          >
            <span className="text-xl md:text-3xl font-serif italic tracking-tight">Ready</span>
            <span className="h-px w-6 bg-[#2c2416] hidden sm:block" />
            <span className="text-[10px] md:text-xl tracking-[0.2em] md:tracking-[0.3em] uppercase text-[#5c4d2e] truncate">
              with love
            </span>
          </Link>
        </div>

        {/* Right: user + settings shortcut */}
        <div className="flex items-center gap-3 md:gap-5">
          <UserButton />
          <Link
            href="/dashboard/settings"
            aria-label="Settings"
            title="Settings"
            className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full border border-[#2c2416]/20 text-[#5c4d2e] hover:text-[#2c2416] hover:border-[#8b6f3a] hover:bg-[#8b6f3a]/10 transition"
          >
            <GearIcon />
          </Link>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-[#2c2416]/40 backdrop-blur-sm z-40"
              aria-hidden="true"
            />

            {/* Panel */}
            <motion.aside
              key="panel"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.35 }}
              className="fixed top-0 left-0 bottom-0 w-[min(360px,85vw)] bg-[#f5f1e8] z-50 shadow-2xl border-r border-[#2c2416]/15 flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Main navigation"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-6 md:px-8 py-5 md:py-7 border-b border-[#2c2416]/10">
                <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a]">
                  Table of Contents
                </p>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="text-xs tracking-[0.2em] uppercase text-[#5c4d2e] hover:text-[#2c2416] transition"
                >
                  Close ✕
                </button>
              </div>

              {/* Chapter list */}
              <ul className="flex-1 overflow-y-auto px-6 md:px-8 py-6 md:py-8 space-y-1">
                {ITEMS.map((item) => (
                  <li key={item.href}>
                    {item.available ? (
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="group flex items-baseline gap-4 py-3 hover:bg-[#8b6f3a]/5 -mx-2 px-2 transition"
                      >
                        <span className="font-serif italic text-sm md:text-base text-[#8b6f3a] w-8 shrink-0">
                          {item.num}
                        </span>
                        <span className="font-serif text-xl md:text-2xl text-[#2c2416] group-hover:text-[#8b6f3a] transition">
                          {item.label}
                        </span>
                      </Link>
                    ) : (
                      <div
                        className="flex items-baseline gap-4 py-3 -mx-2 px-2 cursor-not-allowed"
                        title="Coming soon"
                      >
                        <span className="font-serif italic text-sm md:text-base text-[#8b6f3a]/40 w-8 shrink-0">
                          {item.num}
                        </span>
                        <span className="font-serif text-xl md:text-2xl text-[#2c2416]/40">
                          {item.label}
                        </span>
                        <span className="ml-auto text-[9px] md:text-[10px] tracking-[0.2em] uppercase text-[#8b6f3a]/60 self-center">
                          soon
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {/* Settings at the bottom with gear */}
              <div className="border-t border-[#2c2416]/10 px-6 md:px-8 py-5 md:py-6">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setOpen(false)}
                  className="group flex items-center gap-3 py-2 hover:bg-[#8b6f3a]/5 -mx-2 px-2 transition"
                >
                  <span className="w-6 h-6 flex items-center justify-center text-[#8b6f3a] group-hover:text-[#2c2416] transition">
                    <GearIcon />
                  </span>
                  <span className="font-serif text-lg md:text-xl text-[#2c2416] group-hover:text-[#8b6f3a] transition">
                    Settings
                  </span>
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function GearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4 md:w-[18px] md:h-[18px]"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
