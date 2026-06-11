// components/ArrangementItem.tsx
//
// Phase 1 (was "Zip 2d.2") — one checklist row plus its inline-expand editor.
//
// The row toggles open to reveal a status selector and the structured fields
// defined for this item in lib/arrangement-fields.ts. Saving PATCHes
// /api/arrangements/[id] and hands the updated row back to the parent so the
// progress bar and indicators stay live.

'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  getItemForm,
  displayTitleFor,
  ARRANGEMENT_STATUSES,
  STATUS_PILL_LABELS,
  type ArrangementStatus,
  type DispositionChoice,
  type FieldDef,
  type FieldValue,
} from '@/lib/arrangement-fields'

export type ArrangementRow = {
  id: string
  category: string
  title: string
  status: string
  isCore: boolean
  structuredData: Record<string, unknown> | null
  notes: string | null
  vendor: string | null
  contact: string | null
}

type Props = {
  item: ArrangementRow
  hint?: string
  isLast: boolean
  isOpen: boolean
  // The current Final-disposition choice (from the "Burial or cremation"
  // item), threaded down so this item's fields and title can branch.
  dispositionChoice: DispositionChoice | null
  onToggle: () => void
  onSaved: (updated: ArrangementRow) => void
}

function toStr(v: FieldValue | unknown): string {
  return typeof v === 'string' ? v : ''
}
function toList(v: FieldValue | unknown): string[] {
  return Array.isArray(v) ? (v.filter((e) => typeof e === 'string') as string[]) : []
}

export default function ArrangementItem({
  item,
  hint,
  isLast,
  isOpen,
  dispositionChoice,
  onToggle,
  onSaved,
}: Props) {
  const form = useMemo(() => getItemForm(item.category, item.title), [item.category, item.title])

  const displayTitle = displayTitleFor(item.category, item.title, dispositionChoice)

  const initialData = useMemo(
    () => (item.structuredData ?? {}) as Record<string, FieldValue>,
    [item.structuredData],
  )

  const [draftStatus, setDraftStatus] = useState<ArrangementStatus>(
    (item.status as ArrangementStatus) ?? 'planned',
  )
  const [draftData, setDraftData] = useState<Record<string, FieldValue>>(initialData)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Re-sync the draft whenever this row opens (or its server data changes),
  // so reopening always starts from the saved truth.
  useEffect(() => {
    if (isOpen) {
      setDraftStatus((item.status as ArrangementStatus) ?? 'planned')
      setDraftData(initialData)
      setError(null)
    }
  }, [isOpen, item.status, initialData])

  const dirty =
    draftStatus !== item.status ||
    JSON.stringify(draftData) !== JSON.stringify(initialData)

  function setField(key: string, value: FieldValue) {
    setDraftData((prev) => ({ ...prev, [key]: value }))
  }

  // Branch the form to the disposition choice: drop hidden fields and apply
  // any per-choice label override. Hidden fields keep their stored values —
  // this is display only, so switching branches never deletes data.
  const visibleFields = useMemo(() => {
    const ctx = { choice: dispositionChoice, data: draftData }
    return form.fields
      .filter((f) => !f.showIf || f.showIf(ctx))
      .map((f) =>
        f.labelFor && dispositionChoice && f.labelFor[dispositionChoice]
          ? { ...f, label: f.labelFor[dispositionChoice] as string }
          : f,
      )
  }, [form.fields, dispositionChoice, draftData])

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/arrangements/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: draftStatus, structuredData: draftData }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Could not save')
      }
      const updated = (await res.json()) as ArrangementRow
      onSaved(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  // -------- row indicator --------
  const needsAttention = item.isCore && item.status === 'planned'
  const indicator = (
    <span
      className="mt-1 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center border-[1.5px] border-[#8b6f3a]"
      style={{
        background: item.status === 'arranged' ? '#8b6f3a' : 'transparent',
        opacity: item.status === 'not-applicable' ? 0.4 : 1,
      }}
      aria-hidden
    >
      {item.status === 'arranged' ? (
        <span className="text-[#f5f1e8] text-[10px] leading-none">✓</span>
      ) : item.status === 'in-progress' ? (
        <span className="w-1.5 h-1.5 rounded-full bg-[#8b6f3a]" />
      ) : item.status === 'not-applicable' ? (
        <span className="w-2 h-[1.5px] bg-[#8b6f3a]" />
      ) : needsAttention ? (
        <span className="w-1.5 h-1.5 rounded-full bg-[#8b6f3a]" />
      ) : null}
    </span>
  )

  return (
    <li
      style={{
        borderBottom: !isLast ? '1px solid rgba(139, 111, 58, 0.10)' : 'none',
      }}
    >
      {/* -------- row -------- */}
      <button
        onClick={onToggle}
        className="w-full text-left py-4 flex items-start gap-4 transition-colors hover:bg-[#8b6f3a]/[0.03] -mx-2 px-2 rounded-sm"
        aria-expanded={isOpen}
      >
        {indicator}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-sans text-base text-[#2c2416]">{displayTitle}</span>
            {item.isCore && (
              <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-[#8b6f3a]">
                essential
              </span>
            )}
          </div>
          {hint && (
            <p className="font-sans text-sm mt-1 leading-relaxed text-[#5c4d2e]">{hint}</p>
          )}
        </div>
        <span className="font-sans text-xs whitespace-nowrap mt-1 flex-shrink-0 text-[#8b6f3a]">
          {STATUS_PILL_LABELS[(item.status as ArrangementStatus)] ?? item.status}
        </span>
      </button>

      {/* -------- inline editor -------- */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="pb-6 pt-1 pl-8 pr-1">
              {form.prompt && (
                <p className="font-sans text-sm leading-relaxed mb-5 text-[#5c4d2e]">
                  {form.prompt}
                </p>
              )}

              {/* status pills */}
              <div className="mb-6">
                <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#8b6f3a] mb-2">
                  Status
                </p>
                <div className="flex flex-wrap gap-2">
                  {ARRANGEMENT_STATUSES.map((s) => {
                    const active = draftStatus === s
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setDraftStatus(s)}
                        className={`font-sans text-xs px-3 py-1.5 rounded-full border transition ${
                          active
                            ? 'bg-[#2c2416] text-[#f5f1e8] border-[#2c2416]'
                            : 'bg-transparent text-[#5c4d2e] border-[#8b6f3a]/30 hover:border-[#8b6f3a]'
                        }`}
                      >
                        {STATUS_PILL_LABELS[s]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* fields — dimmed when the item is marked not applicable */}
              <div
                className={`space-y-5 transition-opacity ${
                  draftStatus === 'not-applicable' ? 'opacity-40' : 'opacity-100'
                }`}
              >
                {visibleFields.map((field) => (
                  <Field
                    key={field.key}
                    field={field}
                    value={draftData[field.key] ?? null}
                    onChange={(v) => setField(field.key, v)}
                  />
                ))}
              </div>

              {error && <p className="font-sans text-xs mt-4 text-[#c0392b]">{error}</p>}

              {/* actions */}
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onToggle}
                  disabled={saving}
                  className="font-sans text-xs uppercase tracking-[0.2em] text-[#8b6f3a] hover:text-[#2c2416] transition disabled:opacity-40"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || !dirty}
                  className="font-sans text-xs uppercase tracking-[0.2em] px-4 py-2 rounded-sm bg-[#2c2416] text-[#f5f1e8] hover:bg-[#8b6f3a] transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Field renderer
// ---------------------------------------------------------------------------

const inputClass =
  'w-full font-sans text-base p-3 rounded-sm bg-[#f5f1e8] border border-[#8b6f3a]/25 text-[#2c2416] placeholder:text-[#8b6f3a]/50 focus:outline-none focus:border-[#8b6f3a] transition'

function FieldLabel({ field }: { field: FieldDef }) {
  if (!field.label) return null
  return (
    <label className="block font-sans text-[10px] uppercase tracking-[0.2em] text-[#8b6f3a] mb-2">
      {field.label}
    </label>
  )
}

function Field({
  field,
  value,
  onChange,
}: {
  field: FieldDef
  value: FieldValue
  onChange: (v: FieldValue) => void
}) {
  if (field.type === 'textarea') {
    return (
      <div>
        <FieldLabel field={field} />
        <textarea
          value={toStr(value)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className={`${inputClass} leading-relaxed resize-y`}
        />
        {field.help && <p className="font-sans text-xs mt-1.5 text-[#8b6f3a]">{field.help}</p>}
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <div>
        <FieldLabel field={field} />
        <select
          value={toStr(value)}
          onChange={(e) => onChange(e.target.value || null)}
          className={`${inputClass} appearance-none cursor-pointer`}
        >
          <option value="">Choose…</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {field.help && <p className="font-sans text-xs mt-1.5 text-[#8b6f3a]">{field.help}</p>}
      </div>
    )
  }

  if (field.type === 'boolean') {
    const checked = value === true
    return (
      <div>
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className="flex items-center gap-3 group"
          aria-pressed={checked}
        >
          <span
            className="flex-shrink-0 w-5 h-5 rounded-sm border-[1.5px] border-[#8b6f3a] flex items-center justify-center transition"
            style={{ background: checked ? '#2c2416' : 'transparent' }}
          >
            {checked && <span className="text-[#f5f1e8] text-xs leading-none">✓</span>}
          </span>
          <span className="font-sans text-base text-[#2c2416]">{field.toggleLabel ?? field.label}</span>
        </button>
        {field.help && <p className="font-sans text-xs mt-1.5 text-[#8b6f3a]">{field.help}</p>}
      </div>
    )
  }

  if (field.type === 'list') {
    const entries = toList(value)
    const rows = entries.length > 0 ? entries : ['']
    function update(idx: number, v: string) {
      const next = [...rows]
      next[idx] = v
      onChange(next.filter((e, i) => e.trim() !== '' || i === idx))
    }
    function add() {
      onChange([...entries, ''])
    }
    function remove(idx: number) {
      const next = rows.filter((_, i) => i !== idx)
      onChange(next.filter((e) => e.trim() !== ''))
    }
    return (
      <div>
        <FieldLabel field={field} />
        <div className="space-y-2">
          {rows.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={entry}
                onChange={(e) => update(idx, e.target.value)}
                placeholder={field.placeholder}
                className={inputClass}
              />
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="flex-shrink-0 w-8 h-8 rounded-sm text-[#8b6f3a] hover:text-[#c0392b] hover:bg-[#8b6f3a]/10 transition text-lg leading-none"
                  aria-label="Remove entry"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={add}
          className="font-sans text-xs uppercase tracking-[0.2em] text-[#8b6f3a] hover:text-[#2c2416] transition mt-3"
        >
          + {field.addLabel ?? 'Add'}
        </button>
        {field.help && <p className="font-sans text-xs mt-1.5 text-[#8b6f3a]">{field.help}</p>}
      </div>
    )
  }

  // text | tel | email | date
  return (
    <div>
      <FieldLabel field={field} />
      <input
        type={field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : 'text'}
        value={toStr(value)}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={inputClass}
      />
      {field.help && <p className="font-sans text-xs mt-1.5 text-[#8b6f3a]">{field.help}</p>}
    </div>
  )
}
