// app/dashboard/messages/[id]/edit/page.tsx
'use client'

import { useParams } from 'next/navigation'
import { MessageEditor } from '@/components/MessageEditor'

export default function EditMessagePage() {
  const params = useParams<{ id: string }>()
  return <MessageEditor mode="edit" messageId={params.id} />
}
