// lib/arrangement-seeds.ts
//
// Zip 2d.1 — The seeded checklist that auto-populates on a user's first
// visit to Arrangements. Each entry becomes a row in the Arrangement
// table with status = 'planned' and structuredData = null. The user
// fills these in over time (2d.2). They can also mark items "not
// applicable" (2d.3).
//
// `isCore: true` flags the four essentials we treat as required:
//   - Final disposition preference (Burial or cremation)
//   - Funeral home (or explicit "not yet arranged")
//   - Will location
//   - Executor contact
//
// Everything else is recommended-but-optional.

export type ArrangementCategory =
  | 'disposition'
  | 'service'
  | 'notifications'
  | 'legal'
  | 'wishes'

export const CATEGORY_LABELS: Record<ArrangementCategory, string> = {
  disposition: 'Final disposition',
  service: 'The service',
  notifications: 'Who to notify',
  legal: 'Legal & financial',
  wishes: 'Wishes',
}

export const CATEGORY_DESCRIPTIONS: Record<ArrangementCategory, string> = {
  disposition:
    'What happens to your body, and where. The decisions that, once arranged with a third party, become the firm ground everything else rests on.',
  service:
    'The gathering itself — who speaks, what is read, what is heard. The shape of how people will remember the day.',
  notifications:
    'The institutions that need to be told. Banks, subscriptions, employers. The work nobody wants to do while grieving.',
  legal:
    'Where the documents live and who already knows about them. So nothing important has to be hunted for.',
  wishes:
    'The softer requests. The obituary you would write yourself. What you would like done with the things you leave behind.',
}

export type SeedItem = {
  category: ArrangementCategory
  title: string
  isCore?: boolean
  // A short helper line shown under the title in the list view. Not the
  // form prompts — those land in 2d.2.
  hint?: string
}

export const SEED_ITEMS: SeedItem[] = [
  // ---------- Final disposition ----------
  {
    category: 'disposition',
    title: 'Burial or cremation',
    isCore: true,
    hint: 'The first decision everything else follows from.',
  },
  {
    category: 'disposition',
    title: 'Funeral home',
    isCore: true,
    hint: 'Prearranged, prepaid, or explicitly not yet arranged.',
  },
  {
    category: 'disposition',
    title: 'Cemetery plot or cremation arrangement',
    hint: 'Where, or what is to be done with the ashes.',
  },
  {
    category: 'disposition',
    title: 'Casket or urn preference',
    hint: 'If you have a preference, this is the place for it.',
  },
  {
    category: 'disposition',
    title: 'Headstone or marker',
    hint: 'Wording, material, anything you would like to choose yourself.',
  },

  // ---------- The service ----------
  {
    category: 'service',
    title: 'Type of service',
    hint: 'Funeral, memorial, celebration of life, or no service at all.',
  },
  {
    category: 'service',
    title: 'Venue',
    hint: 'Where you would like it held.',
  },
  {
    category: 'service',
    title: 'Officiant',
    hint: 'A clergy member, a celebrant, or someone you love.',
  },
  {
    category: 'service',
    title: 'Readings',
    hint: 'Passages, poems, or pieces of writing that matter to you.',
  },
  {
    category: 'service',
    title: 'Music',
    hint: 'What you would like played, and by whom.',
  },
  {
    category: 'service',
    title: 'Pallbearers',
    hint: 'The people you would ask to carry you.',
  },
  {
    category: 'service',
    title: 'Flowers',
    hint: 'What you would like, or a request that donations be made instead.',
  },
  {
    category: 'service',
    title: 'Reception',
    hint: 'Where people gather after.',
  },

  // ---------- Notifications ----------
  {
    category: 'notifications',
    title: 'Banks',
    hint: 'Checking, savings, and any other depository accounts.',
  },
  {
    category: 'notifications',
    title: 'Credit cards',
    hint: 'Each card issuer needs to be informed separately.',
  },
  {
    category: 'notifications',
    title: 'Life insurance',
    hint: 'Policy numbers and the contact for filing a claim.',
  },
  {
    category: 'notifications',
    title: 'Health insurance',
    hint: 'Including any Medicare or Medicaid enrollment.',
  },
  {
    category: 'notifications',
    title: 'Employer or pension',
    hint: 'Current employer and any former employers paying pensions.',
  },
  {
    category: 'notifications',
    title: 'Social Security',
    hint: 'Or the equivalent in your country.',
  },
  {
    category: 'notifications',
    title: 'Subscriptions',
    hint: 'Streaming, software, gym, magazines — the recurring charges.',
  },
  {
    category: 'notifications',
    title: 'Utilities',
    hint: 'Electric, gas, water, internet, phone.',
  },
  {
    category: 'notifications',
    title: 'Social media accounts',
    hint: 'Memorialize, delete, or leave alone.',
  },

  // ---------- Legal & financial ----------
  {
    category: 'legal',
    title: 'Will',
    isCore: true,
    hint: 'Where the original document is kept.',
  },
  {
    category: 'legal',
    title: 'Executor',
    isCore: true,
    hint: 'The person you have chosen, and how they can be reached.',
  },
  {
    category: 'legal',
    title: 'Attorney',
    hint: 'Who handled your estate planning, if anyone.',
  },
  {
    category: 'legal',
    title: 'Power of attorney',
    hint: 'Financial, medical, or both.',
  },
  {
    category: 'legal',
    title: 'Safe deposit box',
    hint: 'Where it is, and who has access.',
  },
  {
    category: 'legal',
    title: 'Advance directive',
    hint: 'Living will, healthcare proxy, or DNR if you have one.',
  },

  // ---------- Wishes ----------
  {
    category: 'wishes',
    title: 'Obituary',
    hint: 'A draft in your own voice, or notes for someone else to shape.',
  },
  {
    category: 'wishes',
    title: 'Charitable donations',
    hint: 'Causes you would like remembered in lieu of flowers.',
  },
  {
    category: 'wishes',
    title: 'Personal effects',
    hint: 'Specific items you would like given to specific people.',
  },
  {
    category: 'wishes',
    title: 'Religious or spiritual preferences',
    hint: 'Anything you would want observed, or explicitly not observed.',
  },
  {
    category: 'wishes',
    title: 'A note to whoever handles all this',
    hint: 'Something for the person doing the work.',
  },
]

export const CATEGORY_ORDER: ArrangementCategory[] = [
  'disposition',
  'service',
  'notifications',
  'legal',
  'wishes',
]
