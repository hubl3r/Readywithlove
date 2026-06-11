// lib/arrangement-fields.ts
//
// Phase 1 (was "Zip 2d.2") — Structured per-item forms.
//
// Each seed item in lib/arrangement-seeds.ts gets a tailored set of fields,
// defined here and keyed by `${category}::${title}`. The values a user
// enters are stored as JSON in Arrangement.structuredData, keyed by field
// `key`. Status lives in its own column (Arrangement.status).
//
// This module is the single source of truth shared by:
//   - the inline editor UI (renders the fields)
//   - the PATCH /api/arrangements/[id] route (whitelists & validates keys)
//
// Keep field `key`s stable once shipped — they are persisted in the DB.

import type { ArrangementCategory } from './arrangement-seeds'

// ---------------------------------------------------------------------------
// Status — the four states every item can be in. Shared with the API.
// ---------------------------------------------------------------------------

export const ARRANGEMENT_STATUSES = [
  'planned',
  'in-progress',
  'arranged',
  'not-applicable',
] as const

export type ArrangementStatus = (typeof ARRANGEMENT_STATUSES)[number]

// Friendly labels for the status pills.
export const STATUS_PILL_LABELS: Record<ArrangementStatus, string> = {
  planned: 'Not started',
  'in-progress': 'In progress',
  arranged: 'Arranged',
  'not-applicable': 'Not applicable',
}

// ---------------------------------------------------------------------------
// Field definitions
// ---------------------------------------------------------------------------

export type FieldType =
  | 'text'
  | 'textarea'
  | 'tel'
  | 'email'
  | 'select'
  | 'boolean'
  | 'date'
  | 'list' // repeatable single-line entries -> string[]

export type FieldValue = string | boolean | string[] | null

export type FieldDef = {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  help?: string
  // For `select`.
  options?: { value: string; label: string }[]
  // For `boolean`, the text shown next to the toggle.
  toggleLabel?: string
  // For `list`, the label on the add button (default "Add").
  addLabel?: string
}

export type ItemForm = {
  // A short, warm prompt shown at the top of the expanded editor.
  prompt?: string
  fields: FieldDef[]
}

// Caps enforced both in the UI and (authoritatively) in the API.
export const MAX_FIELD_LENGTH = 5_000
export const MAX_LIST_ITEMS = 50
export const MAX_LIST_ITEM_LENGTH = 500

export function formKey(category: string, title: string): string {
  return `${category}::${title}`
}

// ---------------------------------------------------------------------------
// The forms, one per seed item.
// ---------------------------------------------------------------------------

const NOTES_FIELD: FieldDef = {
  key: 'notes',
  label: 'Notes',
  type: 'textarea',
  placeholder: 'Anything else worth saying…',
}

export const ITEM_FORMS: Record<string, ItemForm> = {
  // ===================== DISPOSITION =====================
  [formKey('disposition', 'Burial or cremation')]: {
    prompt: 'The first decision. Everything else follows from it.',
    fields: [
      {
        key: 'choice',
        label: 'Your preference',
        type: 'select',
        options: [
          { value: 'burial', label: 'Burial' },
          { value: 'cremation', label: 'Cremation' },
          { value: 'green', label: 'Green / natural burial' },
          { value: 'donation', label: 'Donation to science' },
          { value: 'undecided', label: 'Still deciding' },
        ],
      },
      {
        key: 'reason',
        label: 'In your words',
        type: 'textarea',
        placeholder: 'Why this choice, or anything you’d want understood about it.',
      },
    ],
  },
  [formKey('disposition', 'Funeral home')]: {
    prompt: 'Prearranged, prepaid, or explicitly not yet arranged.',
    fields: [
      { key: 'name', label: 'Funeral home', type: 'text', placeholder: 'Name' },
      { key: 'phone', label: 'Phone', type: 'tel', placeholder: '(555) 555-5555' },
      { key: 'address', label: 'Address', type: 'text' },
      {
        key: 'arrangement',
        label: 'Arrangement status',
        type: 'select',
        options: [
          { value: 'prepaid', label: 'Prearranged & prepaid' },
          { value: 'prearranged', label: 'Prearranged, not prepaid' },
          { value: 'none', label: 'Not yet arranged' },
        ],
      },
      {
        key: 'contractNumber',
        label: 'Contract / policy number',
        type: 'text',
        help: 'If there’s a prearrangement on file.',
      },
      NOTES_FIELD,
    ],
  },
  [formKey('disposition', 'Cemetery plot or cremation arrangement')]: {
    fields: [
      {
        key: 'location',
        label: 'Cemetery, or where ashes should go',
        type: 'text',
        placeholder: 'Name or place',
      },
      { key: 'plot', label: 'Plot / section / lot number', type: 'text' },
      {
        key: 'deedLocation',
        label: 'Where the deed or paperwork is kept',
        type: 'text',
      },
      {
        key: 'ashes',
        label: 'Wishes for ashes',
        type: 'textarea',
        placeholder: 'Scattering, keeping, dividing among family…',
        help: 'If cremation.',
      },
    ],
  },
  [formKey('disposition', 'Casket or urn preference')]: {
    fields: [
      {
        key: 'preference',
        label: 'Preference',
        type: 'textarea',
        placeholder: 'Material, style, or a specific product.',
      },
      { key: 'purchased', label: '', type: 'boolean', toggleLabel: 'Already purchased' },
    ],
  },
  [formKey('disposition', 'Headstone or marker')]: {
    fields: [
      {
        key: 'wording',
        label: 'Inscription',
        type: 'textarea',
        placeholder: 'The words you’d like — epitaph, dates, anything.',
      },
      { key: 'material', label: 'Material or style', type: 'text' },
      NOTES_FIELD,
    ],
  },

  // ===================== THE SERVICE =====================
  [formKey('service', 'Type of service')]: {
    fields: [
      {
        key: 'type',
        label: 'Kind of gathering',
        type: 'select',
        options: [
          { value: 'funeral', label: 'Funeral' },
          { value: 'memorial', label: 'Memorial' },
          { value: 'celebration', label: 'Celebration of life' },
          { value: 'graveside', label: 'Graveside only' },
          { value: 'none', label: 'No service' },
        ],
      },
      {
        key: 'tone',
        label: 'The feeling of it',
        type: 'textarea',
        placeholder: 'Solemn, joyful, small and quiet, a big party…',
      },
    ],
  },
  [formKey('service', 'Venue')]: {
    fields: [
      { key: 'name', label: 'Venue', type: 'text', placeholder: 'Where you’d like it held' },
      { key: 'address', label: 'Address', type: 'text' },
      { key: 'contact', label: 'Contact', type: 'text' },
    ],
  },
  [formKey('service', 'Officiant')]: {
    fields: [
      { key: 'name', label: 'Officiant', type: 'text', placeholder: 'Clergy, celebrant, or someone you love' },
      { key: 'contact', label: 'How to reach them', type: 'text' },
      NOTES_FIELD,
    ],
  },
  [formKey('service', 'Readings')]: {
    fields: [
      {
        key: 'readings',
        label: 'Readings',
        type: 'list',
        addLabel: 'Add a reading',
        placeholder: 'A passage or poem — and who should read it',
        help: 'One per line.',
      },
    ],
  },
  [formKey('service', 'Music')]: {
    fields: [
      {
        key: 'selections',
        label: 'Music',
        type: 'list',
        addLabel: 'Add a piece',
        placeholder: 'A song or piece — and who performs it',
        help: 'One per line.',
      },
    ],
  },
  [formKey('service', 'Pallbearers')]: {
    fields: [
      {
        key: 'people',
        label: 'Pallbearers',
        type: 'list',
        addLabel: 'Add a name',
        placeholder: 'Name',
        help: 'Include alternates if you like.',
      },
    ],
  },
  [formKey('service', 'Flowers')]: {
    fields: [
      {
        key: 'preference',
        label: 'Flowers or donations',
        type: 'select',
        options: [
          { value: 'flowers', label: 'Flowers welcome' },
          { value: 'donations', label: 'Donations instead' },
          { value: 'both', label: 'Either is lovely' },
          { value: 'none', label: 'Neither, please' },
        ],
      },
      {
        key: 'details',
        label: 'Details',
        type: 'textarea',
        placeholder: 'Specific flowers, or where donations should go.',
      },
    ],
  },
  [formKey('service', 'Reception')]: {
    fields: [
      { key: 'location', label: 'Where people gather after', type: 'text' },
      NOTES_FIELD,
    ],
  },

  // ===================== NOTIFICATIONS =====================
  [formKey('notifications', 'Banks')]: {
    prompt: 'Each institution that will need to be told.',
    fields: [
      {
        key: 'accounts',
        label: 'Banks',
        type: 'list',
        addLabel: 'Add a bank',
        placeholder: 'Bank name — and where the account details are kept',
        help: 'Don’t paste full account numbers here; note where they’re stored.',
      },
    ],
  },
  [formKey('notifications', 'Credit cards')]: {
    fields: [
      {
        key: 'cards',
        label: 'Credit cards',
        type: 'list',
        addLabel: 'Add a card',
        placeholder: 'Issuer — and where the details are kept',
      },
    ],
  },
  [formKey('notifications', 'Life insurance')]: {
    fields: [
      { key: 'company', label: 'Company', type: 'text' },
      { key: 'policyNumber', label: 'Policy number', type: 'text' },
      { key: 'contact', label: 'Agent or claims contact', type: 'text' },
      NOTES_FIELD,
    ],
  },
  [formKey('notifications', 'Health insurance')]: {
    fields: [
      { key: 'provider', label: 'Provider', type: 'text', help: 'Include Medicare/Medicaid if applicable.' },
      { key: 'memberId', label: 'Member ID', type: 'text' },
      NOTES_FIELD,
    ],
  },
  [formKey('notifications', 'Employer or pension')]: {
    fields: [
      { key: 'employer', label: 'Employer', type: 'text' },
      { key: 'contact', label: 'HR or benefits contact', type: 'text' },
      {
        key: 'pension',
        label: 'Pensions',
        type: 'textarea',
        placeholder: 'Current and former employers paying a pension.',
      },
    ],
  },
  [formKey('notifications', 'Social Security')]: {
    fields: [
      {
        key: 'documentLocation',
        label: 'Where the card / number is kept',
        type: 'text',
        help: 'Note the location — don’t type the number itself.',
      },
      {
        key: 'notes',
        label: 'Notes',
        type: 'textarea',
        placeholder: 'What survivors need to do (or the equivalent in your country).',
      },
    ],
  },
  [formKey('notifications', 'Subscriptions')]: {
    fields: [
      {
        key: 'subscriptions',
        label: 'Subscriptions',
        type: 'list',
        addLabel: 'Add a subscription',
        placeholder: 'Service — streaming, software, gym, magazines…',
      },
    ],
  },
  [formKey('notifications', 'Utilities')]: {
    fields: [
      {
        key: 'utilities',
        label: 'Utilities',
        type: 'list',
        addLabel: 'Add a utility',
        placeholder: 'Provider — electric, gas, water, internet, phone',
      },
    ],
  },
  [formKey('notifications', 'Social media accounts')]: {
    fields: [
      {
        key: 'accounts',
        label: 'Accounts',
        type: 'list',
        addLabel: 'Add an account',
        placeholder: 'Platform — and what to do (memorialize / delete / leave alone)',
      },
    ],
  },

  // ===================== LEGAL & FINANCIAL =====================
  [formKey('legal', 'Will')]: {
    prompt: 'So the original never has to be hunted for.',
    fields: [
      { key: 'documentLocation', label: 'Where the original is kept', type: 'text' },
      { key: 'copyLocations', label: 'Where copies are', type: 'text' },
      { key: 'attorney', label: 'Attorney who prepared it', type: 'text' },
      { key: 'attorneyContact', label: 'Attorney contact', type: 'text' },
    ],
  },
  [formKey('legal', 'Executor')]: {
    prompt: 'The person you’ve chosen to carry this out.',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'relationship', label: 'Relationship to you', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'tel' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'told', label: '', type: 'boolean', toggleLabel: 'They know they’ve been chosen' },
    ],
  },
  [formKey('legal', 'Attorney')]: {
    fields: [
      { key: 'name', label: 'Attorney', type: 'text' },
      { key: 'firm', label: 'Firm', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'tel' },
      { key: 'email', label: 'Email', type: 'email' },
    ],
  },
  [formKey('legal', 'Power of attorney')]: {
    fields: [
      { key: 'financialAgent', label: 'Financial POA', type: 'text', placeholder: 'Who holds it' },
      { key: 'medicalAgent', label: 'Medical POA', type: 'text', placeholder: 'Who holds it' },
      { key: 'documentLocation', label: 'Where the documents are kept', type: 'text' },
      NOTES_FIELD,
    ],
  },
  [formKey('legal', 'Safe deposit box')]: {
    fields: [
      { key: 'location', label: 'Bank & branch', type: 'text' },
      { key: 'boxNumber', label: 'Box number', type: 'text' },
      { key: 'keyLocation', label: 'Where the key is', type: 'text' },
      { key: 'access', label: 'Who has access', type: 'text' },
    ],
  },
  [formKey('legal', 'Advance directive')]: {
    fields: [
      {
        key: 'type',
        label: 'What you have',
        type: 'select',
        options: [
          { value: 'living-will', label: 'Living will' },
          { value: 'proxy', label: 'Healthcare proxy' },
          { value: 'dnr', label: 'DNR' },
          { value: 'multiple', label: 'More than one' },
        ],
      },
      { key: 'proxyName', label: 'Healthcare proxy', type: 'text', placeholder: 'Who speaks for you' },
      { key: 'documentLocation', label: 'Where it’s kept', type: 'text' },
      NOTES_FIELD,
    ],
  },

  // ===================== WISHES =====================
  [formKey('wishes', 'Obituary')]: {
    fields: [
      {
        key: 'draft',
        label: 'Obituary',
        type: 'textarea',
        placeholder: 'Write it in your own voice, or leave notes for someone to shape.',
      },
      { key: 'photo', label: 'Photo preference', type: 'text', placeholder: 'Which photo, or where to find it.' },
    ],
  },
  [formKey('wishes', 'Charitable donations')]: {
    fields: [
      {
        key: 'causes',
        label: 'Causes',
        type: 'list',
        addLabel: 'Add a cause',
        placeholder: 'Organization or cause',
        help: 'Remembered in lieu of flowers.',
      },
    ],
  },
  [formKey('wishes', 'Personal effects')]: {
    fields: [
      {
        key: 'items',
        label: 'Specific bequests',
        type: 'list',
        addLabel: 'Add an item',
        placeholder: 'What, and to whom',
        help: 'For specific items you’d like to go to specific people.',
      },
    ],
  },
  [formKey('wishes', 'Religious or spiritual preferences')]: {
    fields: [
      {
        key: 'preferences',
        label: 'Preferences',
        type: 'textarea',
        placeholder: 'Anything you’d want observed — or explicitly not observed.',
      },
    ],
  },
  [formKey('wishes', 'A note to whoever handles all this')]: {
    fields: [
      {
        key: 'note',
        label: 'A note',
        type: 'textarea',
        placeholder: 'Something for the person doing the work.',
      },
    ],
  },
}

// A safe fallback for any item without an explicit form (shouldn't happen,
// but the UI and API both stay graceful if a seed title changes).
export const FALLBACK_FORM: ItemForm = {
  fields: [NOTES_FIELD],
}

export function getItemForm(category: string, title: string): ItemForm {
  return ITEM_FORMS[formKey(category, title)] ?? FALLBACK_FORM
}

// Re-export for convenience where both are needed.
export type { ArrangementCategory }
