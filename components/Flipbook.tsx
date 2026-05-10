// components/Flipbook.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { PhotoData } from './PhotoCarousel'

export interface FlipbookPage {
  // A page may show one milestone with its photos, or just a chapter cover
  kind: 'cover' | 'milestone'
  title?: string
  subtitle?: string
  date?: string
  story?: string | null
  photos?: PhotoData[]
}

interface FlipbookProps {
  pages: FlipbookPage[]
  pageTurnStyle: 'fade' | 'curl'
  onClose: () => void
}

export function Flipbook({ pages, pageTurnStyle, onClose }: FlipbookProps) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)

  const next = useCallback(() => {
    if (index < pages.length - 1) {
      setDirection(1)
      setIndex((i) => i + 1)
    }
  }, [index, pages.length])

  const prev = useCallback(() => {
    if (index > 0) {
      setDirection(-1)
      setIndex((i) => i - 1)
    }
  }, [index])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [next, prev, onClose])

  const page = pages[index]

  return (
    <div className="fixed inset-0 z-[60] bg-[#2c2416]/90 backdrop-blur-md flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 md:px-10 py-4 md:py-6 text-[#f5f1e8]">
        <div>
          <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase opacity-60">
            The Album
          </p>
          <p className="font-serif italic text-sm md:text-base mt-1 opacity-80">
            page {index + 1} of {pages.length}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-xs md:text-sm tracking-[0.2em] uppercase opacity-70 hover:opacity-100 transition"
        >
          Close ✕
        </button>
      </div>

      {/* Page area */}
      <div className="flex-1 flex items-center justify-center px-4 md:px-12 pb-6 overflow-hidden relative">
        <button
          onClick={prev}
          disabled={index === 0}
          className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full border border-[#f5f1e8]/30 text-[#f5f1e8] flex items-center justify-center hover:bg-[#f5f1e8]/10 disabled:opacity-20 disabled:cursor-not-allowed transition"
          aria-label="Previous page"
        >
          ‹
        </button>
        <button
          onClick={next}
          disabled={index === pages.length - 1}
          className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full border border-[#f5f1e8]/30 text-[#f5f1e8] flex items-center justify-center hover:bg-[#f5f1e8]/10 disabled:opacity-20 disabled:cursor-not-allowed transition"
          aria-label="Next page"
        >
          ›
        </button>

        <div
          className="relative w-full max-w-[1000px] h-full max-h-[80vh]"
          style={{ perspective: pageTurnStyle === 'curl' ? '1800px' : undefined }}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={index}
              custom={direction}
              initial={
                pageTurnStyle === 'curl'
                  ? { rotateY: direction === 1 ? 90 : -90, opacity: 0 }
                  : { opacity: 0, x: direction === 1 ? 40 : -40 }
              }
              animate={
                pageTurnStyle === 'curl'
                  ? { rotateY: 0, opacity: 1 }
                  : { opacity: 1, x: 0 }
              }
              exit={
                pageTurnStyle === 'curl'
                  ? { rotateY: direction === 1 ? -90 : 90, opacity: 0 }
                  : { opacity: 0, x: direction === 1 ? -40 : 40 }
              }
              transition={{ duration: pageTurnStyle === 'curl' ? 0.7 : 0.4, ease: 'easeInOut' }}
              style={{
                transformStyle: pageTurnStyle === 'curl' ? 'preserve-3d' : undefined,
                transformOrigin: pageTurnStyle === 'curl'
                  ? (direction === 1 ? 'left center' : 'right center')
                  : undefined,
              }}
              className="absolute inset-0"
            >
              <PageContent page={page} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function PageContent({ page }: { page: FlipbookPage }) {
  if (page.kind === 'cover') {
    return (
      <div className="w-full h-full bg-[#f5f1e8] flex flex-col items-center justify-center text-center px-8 py-12 shadow-2xl">
        <p className="text-xs md:text-sm tracking-[0.4em] uppercase text-[#8b6f3a] mb-6">
          {page.subtitle || '· an album ·'}
        </p>
        <h1 className="font-serif text-4xl md:text-7xl italic text-[#2c2416] leading-tight">
          {page.title}
        </h1>
      </div>
    )
  }

  const photos = page.photos || []
  const primary = photos[0]
  const others = photos.slice(1, 4) // up to 3 thumbnails

  return (
    <div className="w-full h-full bg-[#f5f1e8] grid grid-cols-1 md:grid-cols-2 shadow-2xl overflow-hidden">
      {/* Left page — text */}
      <div className="p-6 md:p-12 flex flex-col justify-center md:border-r md:border-[#2c2416]/10">
        {page.date && (
          <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-3">
            {page.date}
          </p>
        )}
        <h2 className="font-serif text-2xl md:text-4xl text-[#2c2416] mb-4 leading-tight">
          {page.title}
        </h2>
        {page.story && (
          <p className="font-serif text-sm md:text-base italic text-[#5c4d2e] leading-relaxed whitespace-pre-wrap">
            {page.story}
          </p>
        )}
        {photos[0]?.caption && (
          <p className="mt-6 text-xs md:text-sm text-[#8b6f3a] tracking-wide italic">
            “{photos[0].caption}”
          </p>
        )}
      </div>

      {/* Right page — photos */}
      <div className="bg-[#2c2416]/5 p-4 md:p-6 flex items-center justify-center min-h-[200px]">
        {primary ? (
          <div className="w-full h-full flex flex-col gap-2">
            <div className="flex-1 min-h-0 bg-[#f5f1e8] flex items-center justify-center overflow-hidden">
              <img
                src={primary.url}
                alt={primary.caption || ''}
                className="max-w-full max-h-full object-contain"
              />
            </div>
            {others.length > 0 && (
              <div className="flex gap-2 h-16 md:h-20 shrink-0">
                {others.map((p) => (
                  <div key={p.id} className="flex-1 bg-[#f5f1e8] overflow-hidden">
                    <img src={p.url} alt={p.caption || ''} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="font-serif italic text-[#8b6f3a] text-sm">
            no photographs on this page
          </p>
        )}
      </div>
    </div>
  )
}
