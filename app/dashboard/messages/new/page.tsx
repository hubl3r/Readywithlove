// app/dashboard/messages/new/page.tsx
'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageEditor } from '@/components/MessageEditor'
import { MESSAGE_TYPES, type MessageType } from '@/lib/messageHelpers'

// New-message route. Renders MessageEditor in "new" mode (no id yet). The
// editor POSTs to /api/messages on first save, then router.replaces to the
// /edit page for the newly-created id. This means clicking a type card and
// leaving WITHOUT saving creates zero database rows.
//
// Zip 2c.2.2: accepts ?type=letter|video|photo|story (default letter).

function Inner() {
  const params = useSearchParams()
  const requested = params.get('type') ?? ''
  const type: MessageType = (MESSAGE_TYPES as readonly string[]).includes(requested)
    ? (requested as MessageType)
    : 'letter'
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
