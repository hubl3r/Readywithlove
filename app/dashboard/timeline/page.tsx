// app/dashboard/timeline/page.tsx
'use client'

import { motion, AnimatePresence } from 'motion/react'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PhotoUploader } from '@/components/PhotoUploader'
import { PhotoCarousel, type PhotoData } from '@/components/PhotoCarousel'
import { Flipbook, type FlipbookPage } from '@/components/Flipbook'
import { AppNav } from '@/components/AppNav'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FlexibleDatePicker } from '@/components/FlexibleDatePicker'

interface TimelineItem {
  id: string
  date: string
  title: string
  story: string | null
  mediaUrl: string | null
  photos?: PhotoData[]
}

interface QuotaInfo {
  used: number
  limit: number
  remaining: number
  percent: number
  warning: boolean
  exceeded: boolean
}

const FLIPBOOK_THRESHOLD = 10

// Suspense wrapper — required by Next.js when using useSearchParams in a
// client component. The actual UI lives in TimelineInner below.
export default function Timeline() {
  return (
    <Suspense fallback={<TimelineFallback />}>
      <TimelineInner />
    </Suspense>
  )
}

function TimelineFallback() {
  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#2c2416]">
      <AppNav />
      <main className="relative z-10 max-w-[1100px] mx-auto px-5 md:px-12 py-10 md:py-16">
        <p className="font-serif italic text-[#5c4d2e]">Loading your story…</p>
      </main>
    </div>
  )
}

function TimelineInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [items, setItems] = useState<TimelineItem[]>([])
  const [photosByMilestone, setPhotosByMilestone] = useState<Record<string, PhotoData[]>>({})
  const [quota, setQuota] = useState<QuotaInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ date: '', title: '', story: '', mediaUrl: '' })
  const [saving, setSaving] = useState(false)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [showFlipbook, setShowFlipbook] = useState(false)
  const [pageTurnStyle, setPageTurnStyle] = useState<'fade' | 'curl'>('fade')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  // Zip 2c.2 — When the user clicks "Add to my timeline" on a contribution
  // page, they're redirected here with ?prefill=<contributionId>. We fetch
  // the contribution, populate the form fields, and stash the id so the
  // POST can also mark the contribution imported.
  const [prefillContributionId, setPrefillContributionId] = useState<string | null>(null)
  const [prefillSource, setPrefillSource] = useState<{
    contributorName: string
    type: string
  } | null>(null)
  // Zip 2c.4: surface prefill failures so users don't see a blank page
  const [prefillError, setPrefillError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      const [itemsRes, photosRes, settingsRes] = await Promise.all([
        fetch('/api/timeline'),
        fetch('/api/photos'),
        fetch('/api/settings'),
      ])

      if (itemsRes.ok) setItems(await itemsRes.json())

      if (photosRes.ok) {
        const data = await photosRes.json()
        const grouped: Record<string, PhotoData[]> = {}
        for (const p of data.photos as (PhotoData & { timelineItemId: string | null })[]) {
          const key = p.timelineItemId || '__loose__'
          if (!grouped[key]) grouped[key] = []
          grouped[key].push(p)
        }
        setPhotosByMilestone(grouped)
        setQuota(data.quota)
      }

      if (settingsRes.ok) {
        const s = await settingsRes.json()
        setPageTurnStyle(s.pageTurnStyle === 'curl' ? 'curl' : 'fade')
      }
    } catch (err) {
      console.error('Failed to fetch:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Handle ?prefill=<contributionId>
  useEffect(() => {
    const prefillId = searchParams.get('prefill')
    if (!prefillId) return
    // Already loaded this one — don't re-trigger
    if (prefillContributionId === prefillId) return

    fetch(`/api/contributions/${prefillId}`)
      .then(async (r) => {
        if (!r.ok) {
          // Bubble the error message up so we can surface it
          const errJson = await r.json().catch(() => ({}))
          throw new Error(errJson.error || `Failed to load contribution (${r.status})`)
        }
        return r.json()
      })
      .then((data) => {
        if (!data) return

        // Sensible defaults for the form fields:
        //   - date  → today (contributions don't carry a date; user picks)
        //   - title → generated from contributor name + type
        //   - story → contribution content (letter/story), or contributor note
        //             for video/photo (since there's no inline text)
        //   - mediaUrl → for photo, reuse the blob URL directly
        const today = new Date().toISOString().split('T')[0]
        const titleByType =
          data.type === 'letter' ? `Letter from ${data.contributorName}` :
          data.type === 'video'  ? `Video from ${data.contributorName}`  :
          data.type === 'photo'  ? `Photo from ${data.contributorName}`  :
                                   `A memory from ${data.contributorName}`
        const story =
          data.type === 'letter' || data.type === 'story'
            ? (data.content ?? '')
            : (data.contributorNote ?? '')
        const mediaUrl = data.type === 'photo' ? (data.mediaUrl ?? '') : ''

        setFormData({
          date: today,
          title: titleByType,
          story,
          mediaUrl,
        })
        setPrefillContributionId(prefillId)
        setPrefillSource({
          contributorName: data.contributorName,
          type: data.type,
        })
        setEditingId(null)
        setShowForm(true)
        // Zip 2c.4: clear the prefill-error state on a successful load
        setPrefillError(null)
      })
      .catch((err) => {
        // Zip 2c.4: surface the error to the user instead of silently
        // landing on a blank timeline. Previously this caught and swallowed,
        // which made it look like the link just didn't work.
        console.error('[timeline prefill] fetch failed:', err)
        setPrefillError(
          'We couldn\u2019t load that contribution. Please go back and try again.'
        )
      })
  }, [searchParams, prefillContributionId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.date || !formData.title) return

    setSaving(true)
    try {
      const url = editingId ? `/api/timeline/${editingId}` : '/api/timeline'
      const method = editingId ? 'PATCH' : 'POST'

      // Only include fromContributionId on POST (new item) — editing an
      // existing milestone via prefill makes no sense.
      const body =
        !editingId && prefillContributionId
          ? { ...formData, fromContributionId: prefillContributionId }
          : formData

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        await fetchAll()
        setShowForm(false)
        setEditingId(null)
        setFormData({ date: '', title: '', story: '', mediaUrl: '' })

        // Clear prefill state + clean up the URL so a refresh doesn't
        // re-open the form
        if (prefillContributionId) {
          setPrefillContributionId(null)
          setPrefillSource(null)
          router.replace('/dashboard/timeline')
        }
      }
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item: TimelineItem) => {
    setEditingId(item.id)
    setFormData({
      date: item.date.split('T')[0],
      title: item.title,
      story: item.story || '',
      mediaUrl: item.mediaUrl || '',
    })
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    // If user closes form on a prefill flow, also clean up the URL so
    // they don't get stuck in a "re-open every refresh" loop.
    if (prefillContributionId) {
      setPrefillContributionId(null)
      setPrefillSource(null)
      router.replace('/dashboard/timeline')
    }
  }

  const handleDelete = (id: string) => {
    setPendingDeleteId(id)
  }

  const performDelete = async () => {
    const id = pendingDeleteId
    setPendingDeleteId(null)
    if (!id) return
    try {
      await fetch(`/api/timeline/${id}`, { method: 'DELETE' })
      await fetchAll()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const handleDeletePhoto = async (id: string) => {
    await fetch(`/api/photos/${id}`, { method: 'DELETE' })
    await fetchAll()
  }

  const handleCaption = async (id: string, caption: string) => {
    await fetch(`/api/photos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption }),
    })
    await fetchAll()
  }

  const handleReorder = async (ids: string[]) => {
    const items = ids.map((id, i) => ({ id, order: i }))
    await fetch('/api/photos/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    await fetchAll()
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

  const formatYear = (dateString: string) => new Date(dateString).getFullYear()

  // Group items by year
  const groupedByYear: Record<number, TimelineItem[]> = {}
  items.forEach((item) => {
    const year = formatYear(item.date)
    if (!groupedByYear[year]) groupedByYear[year] = []
    groupedByYear[year].push(item)
  })
  const years = Object.keys(groupedByYear).map(Number).sort((a, b) => a - b)

  const totalPhotos = quota?.used ?? 0
  const flipbookUnlocked = totalPhotos >= FLIPBOOK_THRESHOLD

  const buildFlipbookPages = (): FlipbookPage[] => {
    const pages: FlipbookPage[] = [
      {
        kind: 'cover',
        title: 'My Story',
        subtitle: '· an album ·',
      },
    ]
    items.forEach((item) => {
      const photos = photosByMilestone[item.id] || []
      if (photos.length === 0) return
      pages.push({
        kind: 'milestone',
        title: item.title,
        date: formatDate(item.date),
        story: item.story,
        photos,
      })
    })
    return pages
  }

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#2c2416] relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{ x: [0, 200, 0], y: [0, 150, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 50, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-40 -left-40 w-[500px] md:w-[800px] h-[500px] md:h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,111,58,0.18) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <motion.div
          animate={{ x: [0, -150, 0], y: [0, 200, 0] }}
          transition={{ duration: 60, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 -right-40 w-[500px] md:w-[700px] h-[500px] md:h-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(92,77,46,0.15) 0%, transparent 70%)',
            filter: 'blur(90px)',
          }}
        />
      </div>

      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <AppNav />

      <main className="relative z-10 max-w-[1100px] mx-auto px-5 md:px-12 py-10 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-10 md:mb-16"
        >
          <p className="text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] uppercase text-[#8b6f3a] mb-3 md:mb-4">
            · Chapter One ·
          </p>
          <h1 className="font-serif text-4xl md:text-7xl leading-tight mb-3 md:mb-4">
            Your life,
            <br />
            <span className="italic text-[#8b6f3a]">as a timeline.</span>
          </h1>
          <p className="text-base md:text-lg text-[#5c4d2e] font-light max-w-2xl">
            Add the milestones that mattered—from the day you were born to the moments still being
            written. Photos, stories, and amusing anecdotes only you can tell.
          </p>

          {prefillError && (
            <div className="mt-6 border-l-2 border-[#c0392b] bg-[#c0392b]/5 px-4 py-3 max-w-2xl">
              <p className="font-serif italic text-sm md:text-base text-[#c0392b]">
                {prefillError}
              </p>
              <button
                onClick={() => {
                  setPrefillError(null)
                  router.replace('/dashboard/timeline')
                }}
                className="mt-2 text-[10px] tracking-[0.2em] uppercase text-[#8b6f3a] hover:text-[#2c2416] transition"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="mt-8 md:mt-10 flex flex-wrap gap-3 md:gap-4 items-center">
            <button
              onClick={() => {
                setShowForm(true)
                setEditingId(null)
                setFormData({ date: '', title: '', story: '', mediaUrl: '' })
              }}
              className="group inline-flex items-center gap-3 bg-[#2c2416] text-[#f5f1e8] px-6 md:px-8 py-3 md:py-4 hover:bg-[#8b6f3a] transition cursor-pointer"
            >
              <span className="tracking-[0.2em] uppercase text-xs md:text-sm">Add a milestone</span>
              <span className="text-lg group-hover:translate-x-1 transition">+</span>
            </button>

            <button
              onClick={() => setShowFlipbook(true)}
              disabled={!flipbookUnlocked}
              className="group inline-flex items-center gap-3 border border-[#2c2416] text-[#2c2416] px-6 md:px-8 py-3 md:py-4 hover:bg-[#2c2416] hover:text-[#f5f1e8] transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#2c2416]"
              title={
                flipbookUnlocked
                  ? 'Open the album'
                  : `Add ${FLIPBOOK_THRESHOLD - totalPhotos} more photo${FLIPBOOK_THRESHOLD - totalPhotos === 1 ? '' : 's'} to unlock`
              }
            >
              <span className="tracking-[0.2em] uppercase text-xs md:text-sm">
                {flipbookUnlocked
                  ? 'Open the album'
                  : `Album · ${totalPhotos}/${FLIPBOOK_THRESHOLD}`}
              </span>
              <span>📖</span>
            </button>

            {quota && (
              <p className="text-xs md:text-sm text-[#5c4d2e] font-serif italic ml-auto">
                {quota.used} / {quota.limit} photos
                {quota.warning && (
                  <span className="text-[#c0392b] ml-2 not-italic">· nearing limit</span>
                )}
                {quota.exceeded && (
                  <span className="text-[#c0392b] ml-2 not-italic">· full</span>
                )}
              </p>
            )}
          </div>
        </motion.div>

        {loading ? (
          <p className="text-center text-[#5c4d2e] italic py-20">Loading your story...</p>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-center py-16 md:py-24 border border-[#2c2416]/20 bg-[#f5f1e8]/40 backdrop-blur-md"
          >
            <p className="font-serif text-2xl md:text-3xl italic text-[#5c4d2e] mb-4">
              Your story begins here.
            </p>
            <p className="text-sm md:text-base text-[#8b6f3a] mb-8 max-w-md mx-auto px-5">
              Start with the day you were born. Or any moment that mattered. There&apos;s no wrong
              place to begin.
            </p>
          </motion.div>
        ) : (
          <div className="relative">
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-[#2c2416]/20"></div>

            {years.map((year) => (
              <div key={year} className="mb-8 md:mb-12">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="relative flex items-center gap-4 mb-6 md:mb-8 md:justify-center"
                >
                  <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-3 h-3 bg-[#8b6f3a] rounded-full z-10"></div>
                  <div className="ml-12 md:ml-0 md:bg-[#f5f1e8] md:px-6">
                    <p className="font-serif text-3xl md:text-4xl italic text-[#8b6f3a]">{year}</p>
                  </div>
                </motion.div>

                {groupedByYear[year].map((item, itemIdx) => {
                  const photos = photosByMilestone[item.id] || []
                  const isExpanded = expandedItem === item.id
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-50px' }}
                      transition={{ duration: 0.5, delay: itemIdx * 0.05 }}
                      className={`relative mb-6 md:mb-8 ${
                        itemIdx % 2 === 0 ? 'md:pr-1/2' : 'md:pl-1/2'
                      }`}
                    >
                      <div
                        className={`pl-12 md:pl-0 ${
                          itemIdx % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'
                        }`}
                      >
                        <div className="absolute left-4 md:left-1/2 top-3 -translate-x-1/2 w-2 h-2 bg-[#5c4d2e] rounded-full z-10"></div>

                        <div className="bg-[#f5f1e8]/80 backdrop-blur-md border border-[#2c2416]/10 p-5 md:p-6 group hover:bg-[#ede5d3]/80 transition">
                          <p className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#8b6f3a] mb-2">
                            {formatDate(item.date)}
                          </p>
                          <h3 className="font-serif text-xl md:text-2xl mb-2">{item.title}</h3>
                          {item.mediaUrl && (
                            <div className="mb-3 -mx-1 max-h-64 overflow-hidden bg-black/5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.mediaUrl}
                                alt={item.title}
                                className="block w-full max-h-64 object-cover"
                              />
                            </div>
                          )}
                          {item.story && (
                            <p className="text-sm md:text-base text-[#5c4d2e] leading-relaxed font-light whitespace-pre-wrap">
                              {item.story}
                            </p>
                          )}

                          {photos.length > 0 && !isExpanded && (
                            <button
                              onClick={() => setExpandedItem(item.id)}
                              className={`mt-3 text-xs md:text-sm text-[#8b6f3a] hover:text-[#2c2416] tracking-wide italic transition ${
                                itemIdx % 2 === 0 ? 'md:ml-auto md:block' : ''
                              }`}
                            >
                              View {photos.length} photo{photos.length === 1 ? '' : 's'} →
                            </button>
                          )}

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden text-left"
                              >
                                {photos.length > 0 && (
                                  <PhotoCarousel
                                    photos={photos}
                                    onDelete={handleDeletePhoto}
                                    onCaption={handleCaption}
                                    onReorder={handleReorder}
                                  />
                                )}

                                {quota && quota.remaining > 0 && (
                                  <div className="mt-4">
                                    <PhotoUploader
                                      timelineItemId={item.id}
                                      onUploaded={fetchAll}
                                      remaining={quota.remaining}
                                    />
                                  </div>
                                )}
                                {quota && quota.remaining === 0 && (
                                  <p className="mt-4 text-xs text-[#c0392b] italic">
                                    Photo limit reached. Upgrade your plan to add more.
                                  </p>
                                )}

                                <button
                                  onClick={() => setExpandedItem(null)}
                                  className="mt-3 text-[10px] tracking-[0.2em] uppercase text-[#8b6f3a] hover:text-[#2c2416] transition"
                                >
                                  ↑ Collapse
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {photos.length === 0 && !isExpanded && (
                            <button
                              onClick={() => setExpandedItem(item.id)}
                              className={`mt-3 text-xs md:text-sm text-[#8b6f3a]/70 hover:text-[#8b6f3a] tracking-wide italic transition ${
                                itemIdx % 2 === 0 ? 'md:ml-auto md:block' : ''
                              }`}
                            >
                              + Add photographs
                            </button>
                          )}

                          <div
                            className={`mt-4 flex gap-3 text-[10px] md:text-xs tracking-[0.2em] uppercase opacity-0 group-hover:opacity-100 transition ${
                              itemIdx % 2 === 0 ? 'md:justify-end' : ''
                            }`}
                          >
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-[#8b6f3a] hover:text-[#2c2416] transition"
                            >
                              Edit
                            </button>
                            <span className="text-[#2c2416]/30">·</span>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-[#8b6f3a] hover:text-[#c0392b] transition"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Form Modal */}
        <AnimatePresence>
          {showForm && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleCloseForm}
                className="fixed inset-0 bg-[#2c2416]/40 backdrop-blur-sm z-50"
              />
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-x-5 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 top-1/2 -translate-y-1/2 max-w-lg w-auto md:w-full bg-[#f5f1e8] border border-[#2c2416]/20 z-50 max-h-[90vh] overflow-y-auto"
              >
                <form onSubmit={handleSubmit} className="p-6 md:p-10">
                  <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-2">
                    {editingId
                      ? 'Edit milestone'
                      : prefillSource
                        ? 'Add to your timeline'
                        : 'Add milestone'}
                  </p>
                  <h2 className="font-serif text-2xl md:text-3xl mb-3">
                    {editingId
                      ? 'Refine this moment.'
                      : prefillSource
                        ? <>From <span className="italic">{prefillSource.contributorName}</span></>
                        : 'A moment that mattered.'}
                  </h2>

                  {/* Prefill banner */}
                  {prefillSource && !editingId && (
                    <p className="font-serif italic text-sm md:text-base text-[#5c4d2e] mb-6 md:mb-8">
                      Pick a date that fits this memory and adjust the title if you’d
                      like. The contribution stays in your shoebox either way.
                    </p>
                  )}

                  <div className="mb-5">
                    <label className="block text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#5c4d2e] mb-2">
                      Date
                    </label>
                    <FlexibleDatePicker
                      value={formData.date}
                      onChange={(next) => setFormData({ ...formData, date: next })}
                      required
                    />
                    <p className="text-[10px] italic text-[#5c4d2e]/60 mt-1">
                      Year is required. Month and day are optional — pick what you remember.
                    </p>
                  </div>

                  <div className="mb-5">
                    <label className="block text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#5c4d2e] mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      placeholder="The day I..."
                      className="w-full bg-transparent border-b border-[#2c2416]/30 focus:border-[#8b6f3a] outline-none py-2 text-base md:text-lg font-serif"
                    />
                  </div>

                  <div className="mb-6 md:mb-8">
                    <label className="block text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#5c4d2e] mb-2">
                      Tell the story{' '}
                      <span className="text-[#8b6f3a] normal-case tracking-normal">(optional)</span>
                    </label>
                    <textarea
                      value={formData.story}
                      onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                      placeholder="What happened? Who was there? What did it mean to you?"
                      rows={5}
                      className="w-full bg-transparent border border-[#2c2416]/30 focus:border-[#8b6f3a] outline-none p-3 text-sm md:text-base font-light resize-none"
                    />
                  </div>

                  {/* Photo preview if prefilled from a photo contribution */}
                  {formData.mediaUrl && (
                    <div className="mb-6 md:mb-8">
                      <p className="block text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#5c4d2e] mb-2">
                        Photo
                      </p>
                      <div className="bg-black border border-[#2c2416]/15">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={formData.mediaUrl}
                          alt="From contribution"
                          className="block w-full max-h-60 object-contain mx-auto"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={handleCloseForm}
                      className="px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm tracking-[0.2em] uppercase hover:text-[#8b6f3a] transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm tracking-[0.2em] uppercase bg-[#2c2416] text-[#f5f1e8] hover:bg-[#8b6f3a] transition disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showFlipbook && flipbookUnlocked && (
            <Flipbook
              pages={buildFlipbookPages()}
              pageTurnStyle={pageTurnStyle}
              onClose={() => setShowFlipbook(false)}
            />
          )}
        </AnimatePresence>
      </main>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this milestone?"
        message="Any photos attached to this milestone will also be removed. This cannot be undone."
        tone="danger"
        confirmLabel="Delete"
        onConfirm={performDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  )
}
