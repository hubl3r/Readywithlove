// components/PhotoCarousel.tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'

export interface PhotoData {
  id: string
  url: string
  caption: string | null
  width: number | null
  height: number | null
  order: number
}

interface PhotoCarouselProps {
  photos: PhotoData[]
  onDelete: (id: string) => void
  onCaption: (id: string, caption: string) => void
  onReorder: (ids: string[]) => void
}

// Locked aspect ratio for the frame. 4:3 reads as classic photograph;
// portraits get letterboxed against a blurred version of themselves so the
// frame never bounces and portraits don't feel cramped.
const FRAME_ASPECT = 4 / 3

export function PhotoCarousel({ photos, onDelete, onCaption, onReorder }: PhotoCarouselProps) {
  const [active, setActive] = useState(0)
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionDraft, setCaptionDraft] = useState('')

  if (photos.length === 0) return null

  const photo = photos[Math.min(active, photos.length - 1)]

  const move = (delta: number) => {
    setActive((a) => (a + delta + photos.length) % photos.length)
    setEditingCaption(false)
  }

  const startEdit = () => {
    setCaptionDraft(photo.caption || '')
    setEditingCaption(true)
  }

  const saveCaption = () => {
    onCaption(photo.id, captionDraft)
    setEditingCaption(false)
  }

  const moveOrder = (direction: -1 | 1) => {
    const newIdx = active + direction
    if (newIdx < 0 || newIdx >= photos.length) return
    const next = [...photos]
    ;[next[active], next[newIdx]] = [next[newIdx], next[active]]
    onReorder(next.map((p) => p.id))
    setActive(newIdx)
  }

  return (
    <div className="mt-4">
      {/* Locked-aspect frame */}
      <div
        className="relative bg-[#2c2416]/5 border border-[#2c2416]/10 overflow-hidden"
        style={{ aspectRatio: FRAME_ASPECT }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={photo.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            {/* Blurred backdrop — same image stretched + blurred, fills the frame
                so portrait photos don't show empty bars. Eyes are drawn to the
                centered, in-focus version on top. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url("${photo.url}")`,
                filter: 'blur(28px) brightness(0.85) saturate(0.9)',
                transform: 'scale(1.1)', // hides blur edge bleed
              }}
            />
            {/* Subtle warm wash so the cream theme stays cohesive over dark photos */}
            <div className="absolute inset-0 bg-[#2c2416]/15" aria-hidden="true" />

            {/* The actual photo, contained within the frame */}
            <img
              src={photo.url}
              alt={photo.caption || ''}
              className="absolute inset-0 w-full h-full object-contain"
              loading="lazy"
            />
          </motion.div>
        </AnimatePresence>

        {photos.length > 1 && (
          <>
            <button
              onClick={() => move(-1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#f5f1e8]/90 hover:bg-[#f5f1e8] border border-[#2c2416]/20 flex items-center justify-center text-[#2c2416] transition z-10"
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              onClick={() => move(1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#f5f1e8]/90 hover:bg-[#f5f1e8] border border-[#2c2416]/20 flex items-center justify-center text-[#2c2416] transition z-10"
              aria-label="Next photo"
            >
              ›
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-[#f5f1e8]/85 backdrop-blur-sm px-2 py-1 rounded-full z-10">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActive(i)
                    setEditingCaption(false)
                  }}
                  className={`h-1.5 rounded-full transition ${
                    i === active ? 'bg-[#2c2416] w-4' : 'bg-[#2c2416]/30 w-1.5'
                  }`}
                  aria-label={`Photo ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Caption + controls */}
      <div className="mt-3 flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          {editingCaption ? (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={captionDraft}
                onChange={(e) => setCaptionDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveCaption()}
                placeholder="A caption for this photo…"
                autoFocus
                className="flex-1 bg-transparent border-b border-[#8b6f3a] outline-none py-1 text-sm font-serif italic text-[#5c4d2e]"
              />
              <button
                onClick={saveCaption}
                className="text-[10px] tracking-[0.2em] uppercase text-[#8b6f3a] hover:text-[#2c2416]"
              >
                Save
              </button>
              <button
                onClick={() => setEditingCaption(false)}
                className="text-[10px] tracking-[0.2em] uppercase text-[#5c4d2e]/60 hover:text-[#2c2416]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={startEdit}
              className="text-sm font-serif italic text-[#5c4d2e] hover:text-[#8b6f3a] transition text-left w-full"
            >
              {photo.caption || <span className="opacity-50">+ add a caption</span>}
            </button>
          )}
        </div>

        <div className="flex gap-3 text-[10px] tracking-[0.2em] uppercase shrink-0">
          {photos.length > 1 && (
            <>
              <button
                onClick={() => moveOrder(-1)}
                disabled={active === 0}
                className="text-[#8b6f3a] hover:text-[#2c2416] disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                ← Move
              </button>
              <button
                onClick={() => moveOrder(1)}
                disabled={active === photos.length - 1}
                className="text-[#8b6f3a] hover:text-[#2c2416] disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Move →
              </button>
              <span className="text-[#2c2416]/30">·</span>
            </>
          )}
          <button
            onClick={() => {
              if (confirm('Remove this photo?')) {
                onDelete(photo.id)
                if (active >= photos.length - 1) setActive(Math.max(0, photos.length - 2))
              }
            }}
            className="text-[#8b6f3a] hover:text-[#c0392b] transition"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}
