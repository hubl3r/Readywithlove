// components/ConfirmDialog.tsx
'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  // Optional third button — when provided, the dialog shows three actions:
  //   [cancel]  [alternate]  [confirm]
  // Use for "save / discard / keep editing" patterns. The alternate button
  // sits between the others and uses the neutral outline style.
  alternateLabel?: string
  onAlternate?: () => void
  tone?: 'default' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Editorial confirmation modal. Use in place of window.confirm().
 *
 * Two modes:
 *   - 2-button (default): Cancel + Confirm
 *   - 3-button: Cancel + Alternate + Confirm
 *
 * 3-button example (save-or-discard exit):
 *   <ConfirmDialog
 *     open={leaving}
 *     title="Save your draft?"
 *     message="You have unsaved changes."
 *     confirmLabel="Save as draft"
 *     alternateLabel="Discard"
 *     cancelLabel="Keep editing"
 *     tone="default"
 *     onConfirm={save}
 *     onAlternate={discard}
 *     onCancel={() => setLeaving(false)}
 *   />
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel',
  alternateLabel,
  onAlternate,
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Escape closes, Enter confirms (only in 2-button mode — 3-button is too
  // ambiguous for an Enter shortcut)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter' && !alternateLabel) onConfirm()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onCancel, onConfirm, alternateLabel])

  const hasAlternate = !!(alternateLabel && onAlternate)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onCancel}
            className="fixed inset-0 bg-[#2c2416]/50 backdrop-blur-sm z-[70]"
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-5 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 top-1/2 -translate-y-1/2 max-w-md w-auto md:w-full bg-[#f5f1e8] border border-[#2c2416]/20 z-[80] shadow-2xl"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <div className="p-6 md:p-8">
              <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-2">
                {tone === 'danger' ? '· Take care ·' : '· A moment ·'}
              </p>
              <h2 id="confirm-title" className="font-serif text-2xl md:text-3xl mb-3 text-[#2c2416]">
                {title}
              </h2>
              <p className="font-serif italic text-base md:text-lg text-[#5c4d2e] leading-relaxed">
                {message}
              </p>

              <div className="mt-7 md:mt-8 flex flex-wrap gap-3 justify-end">
                <button
                  onClick={onCancel}
                  className="px-4 md:px-5 py-2.5 md:py-3 text-xs md:text-sm tracking-[0.2em] uppercase text-[#5c4d2e] hover:text-[#2c2416] transition"
                >
                  {cancelLabel}
                </button>
                {hasAlternate && (
                  <button
                    onClick={onAlternate}
                    className="px-4 md:px-5 py-2.5 md:py-3 text-xs md:text-sm tracking-[0.2em] uppercase border border-[#c0392b]/50 text-[#c0392b] hover:bg-[#c0392b]/5 transition"
                  >
                    {alternateLabel}
                  </button>
                )}
                <button
                  onClick={onConfirm}
                  autoFocus
                  className={
                    tone === 'danger' && !hasAlternate
                      ? 'px-4 md:px-5 py-2.5 md:py-3 text-xs md:text-sm tracking-[0.2em] uppercase bg-[#c0392b] text-[#f5f1e8] hover:opacity-90 transition'
                      : 'px-4 md:px-5 py-2.5 md:py-3 text-xs md:text-sm tracking-[0.2em] uppercase bg-[#2c2416] text-[#f5f1e8] hover:bg-[#8b6f3a] transition'
                  }
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
