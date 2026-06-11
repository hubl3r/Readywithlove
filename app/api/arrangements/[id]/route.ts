// app/api/arrangements/[id]/route.ts
//
// Phase 1 (was "Zip 2d.2") — Update a single arrangement.
//
// PATCH accepts { status?, structuredData? }.
//   - status is validated against ARRANGEMENT_STATUSES.
//   - structuredData is validated key-by-key against the field schema for
//     THIS item (looked up by the row's category + title). Unknown keys are
//     rejected; values are type-checked and length-capped. The server is the
//     authority here — the client schema is a convenience, not a trust source.

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  ARRANGEMENT_STATUSES,
  getItemForm,
  MAX_FIELD_LENGTH,
  MAX_LIST_ITEMS,
  MAX_LIST_ITEM_LENGTH,
  type FieldDef,
  type FieldValue,
} from '@/lib/arrangement-fields'

export const runtime = 'nodejs'

type ValidationResult =
  | { ok: true; data: Record<string, FieldValue> }
  | { ok: false; error: string }

function validateField(field: FieldDef, raw: unknown): { ok: true; value: FieldValue } | { ok: false; error: string } {
  // A null or empty string clears any scalar field.
  if (raw === null || raw === undefined) return { ok: true, value: null }

  switch (field.type) {
    case 'boolean': {
      if (typeof raw !== 'boolean') return { ok: false, error: `${field.key} must be true/false` }
      return { ok: true, value: raw }
    }
    case 'list': {
      if (!Array.isArray(raw)) return { ok: false, error: `${field.key} must be a list` }
      if (raw.length > MAX_LIST_ITEMS) return { ok: false, error: `${field.key}: too many entries` }
      const cleaned: string[] = []
      for (const entry of raw) {
        if (typeof entry !== 'string') return { ok: false, error: `${field.key}: entries must be text` }
        const t = entry.trim()
        if (t.length === 0) continue // drop blank rows
        if (t.length > MAX_LIST_ITEM_LENGTH) return { ok: false, error: `${field.key}: an entry is too long` }
        cleaned.push(t)
      }
      return { ok: true, value: cleaned }
    }
    case 'select': {
      if (typeof raw !== 'string') return { ok: false, error: `${field.key} must be a choice` }
      if (raw === '') return { ok: true, value: null }
      const allowed = (field.options ?? []).map((o) => o.value)
      if (!allowed.includes(raw)) return { ok: false, error: `${field.key}: invalid choice` }
      return { ok: true, value: raw }
    }
    default: {
      // text | textarea | tel | email | date
      if (typeof raw !== 'string') return { ok: false, error: `${field.key} must be text` }
      const t = raw.trim()
      if (t.length === 0) return { ok: true, value: null }
      if (t.length > MAX_FIELD_LENGTH) return { ok: false, error: `${field.key}: too long` }
      return { ok: true, value: t }
    }
  }
}

function validateStructuredData(
  category: string,
  title: string,
  raw: unknown,
): ValidationResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'structuredData must be an object' }
  }
  const form = getItemForm(category, title)
  const byKey = new Map(form.fields.map((f) => [f.key, f]))
  const out: Record<string, FieldValue> = {}

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const field = byKey.get(key)
    if (!field) return { ok: false, error: `Unknown field: ${key}` }
    const result = validateField(field, value)
    if (!result.ok) return { ok: false, error: result.error }
    // Persist nulls too — an explicit clear should overwrite a stored value.
    out[key] = result.value
  }
  return { ok: true, data: out }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.arrangement.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}

  if (body.status !== undefined) {
    if (!(ARRANGEMENT_STATUSES as readonly string[]).includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    data.status = body.status
  }

  if (body.structuredData !== undefined) {
    const result = validateStructuredData(existing.category, existing.title, body.structuredData)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    // Merge onto whatever's stored so a partial save doesn't wipe other fields.
    const current =
      existing.structuredData && typeof existing.structuredData === 'object' && !Array.isArray(existing.structuredData)
        ? (existing.structuredData as Record<string, FieldValue>)
        : {}
    data.structuredData = { ...current, ...result.data }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const updated = await prisma.arrangement.update({ where: { id }, data })

  return NextResponse.json({
    id: updated.id,
    category: updated.category,
    title: updated.title,
    status: updated.status,
    isCore: updated.isCore,
    structuredData: updated.structuredData,
    notes: updated.notes,
    vendor: updated.vendor,
    contact: updated.contact,
  })
}
