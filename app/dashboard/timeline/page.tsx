'use client'

import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { useState, useEffect } from 'react'

interface TimelineItem {
  id: string
  date: string
  title: string
  story: string | null
  mediaUrl: string | null
}

export default function Timeline() {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ date: '', title: '', story: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/timeline')
      if (res.ok) {
        const data = await res.json()
        setItems(data)
      }
    } catch (err) {
      console.error('Failed to fetch timeline:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.date || !formData.title) return

    setSaving(true)
    try {
      const url = editingId ? `/api/timeline/${editingId}` : '/api/timeline'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        await fetchItems()
        setShowForm(false)
        setEditingId(null)
        setFormData({ date: '', title: '', story: '' })
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
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return

    try {
      await fetch(`/api/timeline/${id}`, { method: 'DELETE' })
      await fetchItems()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const formatYear = (dateString: string) => {
    return new Date(dateString).getFullYear()
  }

  // Group items by year
  const groupedByYear: Record<number, TimelineItem[]> = {}
  items.forEach(item => {
    const year = formatYear(item.date)
    if (!groupedByYear[year]) groupedByYear[year] = []
    groupedByYear[year].push(item)
  })
  const years = Object.keys(groupedByYear).map(Number).sort((a, b) => a - b)

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#2c2416] relative overflow-x-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{ x: [0, 200, 0], y: [0, 150, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 50, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -left-40 w-[500px] md:w-[800px] h-[500px] md:h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,111,58,0.18) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <motion.div
          animate={{ x: [0, -150, 0], y: [0, 200, 0] }}
          transition={{ duration: 60, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 -right-40 w-[500px] md:w-[700px] h-[500px] md:h-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(92,77,46,0.15) 0%, transparent 70%)',
            filter: 'blur(90px)',
          }}
        />
      </div>

      {/* Grain overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-50" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
      }}/>

      {/* Navigation */}
      <nav className="relative z-10 flex justify-between items-center px-5 md:px-12 py-5 md:py-8 max-w-[1400px] mx-auto gap-3 border-b border-[#2c2416]/10">
        <Link href="/" className="flex items-baseline gap-2 md:gap-3 min-w-0 hover:opacity-80 transition">
          <span className="text-xl md:text-3xl font-serif italic tracking-tight">Ready</span>
          <span className="h-px w-6 bg-[#2c2416] hidden sm:block"></span>
          <span className="text-[10px] md:text-xl tracking-[0.2em] md:tracking-[0.3em] uppercase text-[#5c4d2e] truncate">with love</span>
        </Link>
        <div className="flex items-center gap-4 md:gap-6">
          <Link href="/dashboard" className="text-[10px] md:text-sm tracking-widest uppercase hover:text-[#8b6f3a] transition">
            ← Dashboard
          </Link>
          <UserButton />
        </div>
      </nav>

      <main className="relative z-10 max-w-[1100px] mx-auto px-5 md:px-12 py-10 md:py-16">
        {/* Header */}
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
            Your life,<br/>
            <span className="italic text-[#8b6f3a]">as a timeline.</span>
          </h1>
          <p className="text-base md:text-lg text-[#5c4d2e] font-light max-w-2xl">
            Add the milestones that mattered—from the day you were born to the moments still being written. Photos, stories, and amusing anecdotes only you can tell.
          </p>

          <button
            onClick={() => {
              setShowForm(true)
              setEditingId(null)
              setFormData({ date: '', title: '', story: '' })
            }}
            className="mt-8 md:mt-10 group inline-flex items-center gap-3 bg-[#2c2416] text-[#f5f1e8] px-6 md:px-8 py-3 md:py-4 hover:bg-[#8b6f3a] transition cursor-pointer"
          >
            <span className="tracking-[0.2em] uppercase text-xs md:text-sm">Add a milestone</span>
            <span className="text-lg group-hover:translate-x-1 transition">+</span>
          </button>
        </motion.div>

        {/* Timeline */}
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
              Start with the day you were born. Or any moment that mattered. There's no wrong place to begin.
            </p>
          </motion.div>
        ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-[#2c2416]/20"></div>

            {years.map((year) => (
              <div key={year} className="mb-8 md:mb-12">
                {/* Year marker */}
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

                {/* Items in this year */}
                {groupedByYear[year].map((item, itemIdx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: itemIdx * 0.05 }}
                    className={`relative mb-6 md:mb-8 ${
                      itemIdx % 2 === 0 ? 'md:pr-1/2' : 'md:pl-1/2'
                    }`}
                  >
                    <div className={`pl-12 md:pl-0 ${itemIdx % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                      <div className="absolute left-4 md:left-1/2 top-3 -translate-x-1/2 w-2 h-2 bg-[#5c4d2e] rounded-full z-10"></div>

                      <div className="bg-[#f5f1e8]/80 backdrop-blur-md border border-[#2c2416]/10 p-5 md:p-6 group hover:bg-[#ede5d3]/80 transition">
                        <p className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#8b6f3a] mb-2">
                          {formatDate(item.date)}
                        </p>
                        <h3 className="font-serif text-xl md:text-2xl mb-2">{item.title}</h3>
                        {item.story && (
                          <p className="text-sm md:text-base text-[#5c4d2e] leading-relaxed font-light whitespace-pre-wrap">
                            {item.story}
                          </p>
                        )}
                        <div className={`mt-4 flex gap-3 text-[10px] md:text-xs tracking-[0.2em] uppercase opacity-0 group-hover:opacity-100 transition ${itemIdx % 2 === 0 ? 'md:justify-end' : ''}`}>
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
                ))}
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
                onClick={() => setShowForm(false)}
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
                    {editingId ? 'Edit milestone' : 'Add milestone'}
                  </p>
                  <h2 className="font-serif text-2xl md:text-3xl mb-6 md:mb-8">
                    {editingId ? 'Refine this moment.' : 'A moment that mattered.'}
                  </h2>

                  <div className="mb-5">
                    <label className="block text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#5c4d2e] mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="w-full bg-transparent border-b border-[#2c2416]/30 focus:border-[#8b6f3a] outline-none py-2 text-base md:text-lg font-serif"
                    />
                  </div>

                  <div className="mb-5">
                    <label className="block text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#5c4d2e] mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      required
                      placeholder="The day I..."
                      className="w-full bg-transparent border-b border-[#2c2416]/30 focus:border-[#8b6f3a] outline-none py-2 text-base md:text-lg font-serif"
                    />
                  </div>

                  <div className="mb-6 md:mb-8">
                    <label className="block text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#5c4d2e] mb-2">
                      Tell the story <span className="text-[#8b6f3a] normal-case tracking-normal">(optional)</span>
                    </label>
                    <textarea
                      value={formData.story}
                      onChange={e => setFormData({ ...formData, story: e.target.value })}
                      placeholder="What happened? Who was there? What did it mean to you?"
                      rows={5}
                      className="w-full bg-transparent border border-[#2c2416]/30 focus:border-[#8b6f3a] outline-none p-3 text-sm md:text-base font-light resize-none"
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
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
      </main>
    </div>
  )
}
