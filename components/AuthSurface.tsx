// components/AuthSurface.tsx
//
// Custom-branded, animated auth surface for "Ready with Love." Replaces the
// default Clerk modal: a full-page split layout (editorial brand panel + auth
// card) over the app's signature drifting-blob background. Clerk's prebuilt
// <SignIn>/<SignUp> still do the actual auth work (OAuth, MFA, email codes,
// password reset, error handling) but are themed via lib/clerk-appearance.ts
// to dissolve into the page.
//
// The sign-in <-> sign-up switch is an in-place animated transition (not a
// route change): we keep both Clerk components on the same URL using
// routing="hash" and swap them with AnimatePresence, so login -> signup ->
// authenticated feels like one continuous flow.

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { SignIn, SignUp } from '@clerk/nextjs'
import { authAppearance } from '@/lib/clerk-appearance'

export type AuthMode = 'sign-in' | 'sign-up'

const EASE = [0.22, 1, 0.36, 1] as const

const COPY: Record<
  AuthMode,
  {
    eyebrow: string
    titleTop: string
    titleAccent: string
    sub: string
    switchText: string
    switchCta: string
  }
> = {
  'sign-in': {
    eyebrow: '· Welcome back ·',
    titleTop: 'Pick up',
    titleAccent: 'where you left off.',
    sub: 'Your story is just as you left it. Sign in to keep writing it.',
    switchText: 'New to Ready with Love?',
    switchCta: 'Begin your story',
  },
  'sign-up': {
    eyebrow: '· Begin your story ·',
    titleTop: 'The story',
    titleAccent: 'you leave behind.',
    sub: 'A few quiet minutes now is a gift to the people you love most.',
    switchText: 'Already have an account?',
    switchCta: 'Sign in',
  },
}

export default function AuthSurface({ initialMode }: { initialMode: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const reduce = useReducedMotion()
  const copy = COPY[mode]
  const other: AuthMode = mode === 'sign-in' ? 'sign-up' : 'sign-in'

  // Slide direction: sign-in enters from the left, sign-up from the right, so
  // the toggle has a consistent sense of motion.
  const enterX = mode === 'sign-in' ? -16 : 16

  return (
    <>
      {/* Cream base so the page never flashes white behind the blobs. */}
      <div className="fixed inset-0 -z-10 bg-[#f5f1e8]" />

      {/* Drifting blobs — the app's signature background (see ArrangementsView). */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={
            reduce
              ? undefined
              : { x: [0, 200, -50, 100, 0], y: [0, 150, 200, 50, 0], scale: [1, 1.3, 0.95, 1.1, 1] }
          }
          transition={{ duration: 50, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-40 -left-40 w-[500px] md:w-[800px] h-[500px] md:h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,111,58,0.18) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <motion.div
          animate={reduce ? undefined : { x: [0, -150, 50, -100, 0], y: [0, 200, -50, 150, 0] }}
          transition={{ duration: 60, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 -right-40 w-[500px] md:w-[700px] h-[500px] md:h-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(92,77,46,0.15) 0%, transparent 70%)',
            filter: 'blur(90px)',
          }}
        />
      </div>

      {/* Noise overlay — top of the stack, click-through. */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Wordmark / home link. */}
      <Link
        href="/"
        className="fixed top-5 left-5 md:top-8 md:left-10 z-20 flex items-baseline gap-2 group"
      >
        <span className="text-xl md:text-2xl font-serif italic tracking-tight text-[#2c2416]">
          Ready
        </span>
        <span className="text-[9px] md:text-[11px] tracking-[0.25em] uppercase text-[#5c4d2e] group-hover:text-[#8b6f3a] transition">
          with love
        </span>
      </Link>

      <main className="relative z-10 min-h-screen grid md:grid-cols-2 max-w-[1400px] mx-auto">
        {/* -------- Left editorial panel (desktop) -------- */}
        <section className="hidden md:flex flex-col justify-center px-12 lg:px-20 py-16">
          {/* Parent fades the whole block on mode-swap; children stagger in,
              so the Cormorant headline replays a choreographed entrance every
              time the register transition fires. */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.05, ease: EASE }}
                className="text-xs tracking-[0.4em] uppercase text-[#8b6f3a] mb-6"
              >
                {copy.eyebrow}
              </motion.p>
              <h1 className="font-serif text-5xl lg:text-7xl leading-[0.95] tracking-tight text-[#2c2416]">
                <motion.span
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.14, ease: EASE }}
                  className="block"
                >
                  {copy.titleTop}
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.26, ease: EASE }}
                  className="block italic text-[#8b6f3a]"
                >
                  {copy.titleAccent}
                </motion.span>
              </h1>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: 96 }}
                transition={{ duration: 0.8, delay: 0.42, ease: EASE }}
                className="h-px bg-[#2c2416] my-8"
              />
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.52, ease: EASE }}
                className="font-sans text-lg leading-relaxed max-w-sm text-[#5c4d2e] font-light"
              >
                {copy.sub}
              </motion.p>
            </motion.div>
          </AnimatePresence>
        </section>

        {/* -------- Right auth card -------- */}
        <section className="flex flex-col justify-center items-center px-6 py-20 md:px-12 lg:px-16">
          <div className="w-full max-w-sm">
            {/* Mobile-only mini headline. */}
            <div className="md:hidden mb-8 text-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.4, ease: EASE }}
                >
                  <p className="text-[10px] tracking-[0.3em] uppercase text-[#8b6f3a] mb-3">
                    {copy.eyebrow}
                  </p>
                  <h1 className="font-serif text-3xl leading-tight text-[#2c2416]">
                    {copy.titleTop}{' '}
                    <span className="italic text-[#8b6f3a]">{copy.titleAccent}</span>
                  </h1>
                </motion.div>
              </AnimatePresence>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: enterX }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -enterX }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                {mode === 'sign-in' ? (
                  <SignIn
                    routing="hash"
                    appearance={authAppearance}
                    signUpUrl="/sign-up"
                    fallbackRedirectUrl="/dashboard"
                  />
                ) : (
                  <SignUp
                    routing="hash"
                    appearance={authAppearance}
                    signInUrl="/sign-in"
                    fallbackRedirectUrl="/dashboard"
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Our own animated sign-in <-> sign-up toggle (Clerk's is hidden). */}
            <div className="mt-8 text-center">
              <span className="font-sans text-sm text-[#5c4d2e]">{copy.switchText} </span>
              <button
                type="button"
                onClick={() => setMode(other)}
                className="font-sans text-sm uppercase tracking-[0.15em] text-[#8b6f3a] hover:text-[#2c2416] transition border-b border-[#8b6f3a]/40 hover:border-[#2c2416] pb-0.5 cursor-pointer"
              >
                {copy.switchCta}
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
