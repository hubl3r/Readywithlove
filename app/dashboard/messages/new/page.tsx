// app/dashboard/messages/new/page.tsx
'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageEditor } from '@/components/MessageEditor'

// New-message route. Renders MessageEditor in "new" mode (no id yet). The
// editor POSTs to /api/messages on first save, then router.replaces to the
// /edit page for the newly-created id. This means clicking "Write a letter"
// or "Record a video" and leaving WITHOUT saving creates zero database rows.

function Inner() {
  const params = useSearchParams()
  const type = params.get('type') === 'video' ? 'video' : 'letter'
  return <MessageEditor mode="new" initialType={type} />
}

export default function NewMessagePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f5f1e8] text-[#5c4d2e]">
        <p className="font-serif italic text-lg">Loading…</p>
      </div>
    }>
      <Inner />
    </Suspense>
  )
}
