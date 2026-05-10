// components/PhotoUploader.tsx
'use client'

import { useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { compressImage, isSupportedImageType } from '@/lib/imageCompress'

interface UploadStatus {
  filename: string
  state: 'compressing' | 'uploading' | 'done' | 'error'
  message?: string
}

interface PhotoUploaderProps {
  timelineItemId?: string | null
  onUploaded: () => void
  remaining: number // photos left in quota
}

export function PhotoUploader({ timelineItemId, onUploaded, remaining }: PhotoUploaderProps) {
  const [dragOver, setDragOver] = useState(false)
  const [statuses, setStatuses] = useState<UploadStatus[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter(isSupportedImageType)
      if (list.length === 0) return

      // Trim to remaining quota
      const toUpload = list.slice(0, Math.max(0, remaining))
      const skipped = list.length - toUpload.length

      // Initialize statuses
      const initial = toUpload.map((f) => ({
        filename: f.name,
        state: 'compressing' as const,
      }))
      if (skipped > 0) {
        initial.push({
          filename: `${skipped} photo${skipped === 1 ? '' : 's'} skipped (over quota)`,
          state: 'error',
        })
      }
      setStatuses(initial)

      let anySuccess = false
      for (let i = 0; i < toUpload.length; i++) {
        const file = toUpload[i]
        try {
          // Compress
          const compressed = await compressImage(file)
          setStatuses((prev) =>
            prev.map((s, idx) => (idx === i ? { ...s, state: 'uploading' } : s))
          )

          // Upload
          const fd = new FormData()
          fd.append(
            'file',
            new File([compressed.blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: 'image/jpeg',
            })
          )
          if (timelineItemId) fd.append('timelineItemId', timelineItemId)
          fd.append('width', String(compressed.width))
          fd.append('height', String(compressed.height))

          const res = await fetch('/api/photos', { method: 'POST', body: fd })
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.message || err.error || 'Upload failed')
          }
          anySuccess = true
          setStatuses((prev) =>
            prev.map((s, idx) => (idx === i ? { ...s, state: 'done' } : s))
          )
        } catch (err) {
          setStatuses((prev) =>
            prev.map((s, idx) =>
              idx === i
                ? { ...s, state: 'error', message: (err as Error).message }
                : s
            )
          )
        }
      }

      if (anySuccess) onUploaded()

      // Auto-clear successful statuses after a moment
      setTimeout(() => {
        setStatuses((prev) => prev.filter((s) => s.state === 'error'))
      }, 2500)
    },
    [timelineItemId, onUploaded, remaining]
  )

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={`cursor-pointer border border-dashed transition p-6 md:p-8 text-center ${
          dragOver
            ? 'border-[#8b6f3a] bg-[#8b6f3a]/5'
            : 'border-[#2c2416]/30 hover:border-[#8b6f3a]/60 hover:bg-[#f5f1e8]/40'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <p className="font-serif text-lg md:text-xl italic text-[#5c4d2e] mb-1">
          Add photographs
        </p>
        <p className="text-xs md:text-sm text-[#8b6f3a] tracking-wide">
          Drop images here, or tap to choose · {remaining} remaining
        </p>
      </div>

      <AnimatePresence>
        {statuses.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-1 overflow-hidden"
          >
            {statuses.map((s, i) => (
              <li
                key={i}
                className={`text-[11px] md:text-xs tracking-wide flex items-center gap-2 ${
                  s.state === 'error' ? 'text-[#c0392b]' : 'text-[#5c4d2e]'
                }`}
              >
                <span className="font-serif italic truncate">{s.filename}</span>
                <span className="text-[#8b6f3a]">·</span>
                <span>
                  {s.state === 'compressing' && 'preparing…'}
                  {s.state === 'uploading' && 'uploading…'}
                  {s.state === 'done' && '✓ done'}
                  {s.state === 'error' && (s.message || 'failed')}
                </span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
