'use client'

import { UserButton, useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { motion } from 'motion/react'
import { useState } from 'react'

export default function Dashboard() {
  const { user, isLoaded } = useUser()
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  const sections = [
    {
      num: 'i.',
      title: 'Timeline',
      subtitle: 'Your life, as a story',
      desc: 'Add milestones, photos, and stories from your life.',
      href: '/dashboard/timeline',
      stat: '0 milestones',
    },
    {
      num: 'ii.',
      title: 'Messages',
      subtitle: 'Letters across time',
      desc: 'Record videos and write letters for future delivery.',
      href: '/dashboard/messages',
      stat: '0 messages',
    },
    {
      num: 'iii.',
      title: 'Arrangements',
      subtitle: 'Affairs in order',
      desc: 'Pre-arrange funeral details, vendors, and final wishes.',
      href: '/dashboard/arrangements',
      stat: 'Not started',
    },
    {
      num: 'iv.',
      title: 'Contacts',
      subtitle: 'Your circle',
      desc: 'Manage who gets notified and who acts on your behalf.',
      href: '/dashboard/contacts',
      stat: '0 contacts',
    },
    {
      num: 'v.',
      title: 'Vault',
      subtitle: 'What only you know',
      desc: 'Securely store passwords, documents, and final instructions.',
      href: '/dashboard/vault',
      stat: '0 items',
    },
    {
      num: 'vi.',
      title: 'Executor',
      subtitle: 'Your trusted person',
      desc: 'Designate who unlocks everything when the time comes.',
      href: '/dashboard/executor',
      stat: 'Not assigned',
    },
  ]

  const checklistItems = [
    { label: 'Add your first milestone', done: false },
    { label: 'Record one message for a loved one', done: false },
    { label: 'Designate an executor', done: false },
    { label: 'Add 3 emergency contacts', done: false },
    { label: 'Document funeral preferences', done: false },
  ]

  const completedCount = checklistItems.filter(item => item.done).length
  const progress = Math.round((completedCount / checklistItems.length) * 100)

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#2c2416] relative overflow-x-hidden">
      {/* Subtle animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{ 
            x: [0, 200, -50, 100, 0], 
            y: [0, 150, 200, 50, 0],
            scale: [1, 1.3, 0.95, 1.1, 1],
          }}
          transition={{ duration: 50, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -left-40 w-[500px] md:w-[800px] h-[500px] md:h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,111,58,0.18) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <motion.div
          animate={{ 
            x: [0, -150, 50, -100, 0], 
            y: [0, 200, -50, 150, 0],
          }}
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
          <Link href="/" className="text-[10px] md:text-sm tracking-widest uppercase hover:text-[#8b6f3a] transition hidden sm:block">
            Home
          </Link>
          <UserButton />
        </div>
      </nav>

      {/* Welcome */}
      <main className="relative z-10 max-w-[1400px] mx-auto px-5 md:px-12 py-10 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] uppercase text-[#8b6f3a] mb-3 md:mb-4">
            · Your dashboard ·
          </p>
          <h1 className="font-serif text-4xl md:text-7xl leading-tight mb-2 md:mb-4">
            Welcome,<br/>
            <span className="italic text-[#8b6f3a]">
              {isLoaded && user ? (user.firstName || 'friend') : 'friend'}.
            </span>
          </h1>
          <p className="text-base md:text-lg text-[#5c4d2e] font-light max-w-2xl">
            Your story is waiting. Begin anywhere—every chapter you write today is a gift to someone you love.
          </p>
        </motion.div>

        {/* Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 md:mt-16 grid grid-cols-12 gap-6 md:gap-8"
        >
          <div className="col-span-12 md:col-span-5">
            <div className="bg-[#f5f1e8]/60 backdrop-blur-md border border-[#2c2416]/10 p-6 md:p-8">
              <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-3">Your Progress</p>
              <div className="flex items-baseline gap-3 mb-5">
                <span className="font-serif text-5xl md:text-6xl">{progress}<span className="text-2xl md:text-3xl text-[#8b6f3a]">%</span></span>
                <span className="text-sm text-[#5c4d2e]">{completedCount} of {checklistItems.length}</span>
              </div>
              <div className="w-full h-px bg-[#2c2416]/20 mb-5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full bg-[#8b6f3a]"
                />
              </div>
              <ul className="space-y-2 md:space-y-3">
                {checklistItems.map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.6 + i * 0.08 }}
                    className="flex items-start gap-3 text-sm md:text-base"
                  >
                    <span className={`flex-shrink-0 mt-0.5 w-4 h-4 border ${item.done ? 'bg-[#8b6f3a] border-[#8b6f3a]' : 'border-[#2c2416]/40'}`}>
                      {item.done && <span className="text-[#f5f1e8] text-xs flex items-center justify-center">✓</span>}
                    </span>
                    <span className={item.done ? 'line-through text-[#8b6f3a]' : 'text-[#5c4d2e]'}>
                      {item.label}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>

          <div className="col-span-12 md:col-span-7">
            <div className="bg-[#2c2416] text-[#f5f1e8] p-6 md:p-10 h-full flex flex-col justify-between min-h-[300px]">
              <div>
                <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-3 md:mb-4">Today's prompt</p>
                <p className="font-serif text-2xl md:text-4xl italic leading-snug mb-4 md:mb-6">
                  "What's one piece of advice<br/>
                  you wish you'd received<br/>
                  when you were younger?"
                </p>
                <p className="text-sm md:text-base text-[#f5f1e8]/70 font-light leading-relaxed max-w-md">
                  Take two minutes. Add it to your timeline as a voice note, video, or written reflection. Future generations will thank you.
                </p>
              </div>
              <Link href="/dashboard/timeline" className="group inline-flex items-center gap-3 mt-6 md:mt-8 self-start text-xs md:text-sm tracking-[0.2em] uppercase border-b border-[#f5f1e8] pb-1 hover:text-[#8b6f3a] hover:border-[#8b6f3a] transition">
                Add to timeline
                <span className="group-hover:translate-x-1 transition">→</span>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Sections grid */}
        <div className="mt-12 md:mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-8 md:mb-10"
          >
            <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-3">· Your chapters ·</p>
            <h2 className="font-serif text-3xl md:text-5xl">
              Where would you like<br/>
              <span className="italic">to begin today?</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#2c2416]/20">
            {sections.map((section, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <Link 
                  href={section.href}
                  className="block bg-[#f5f1e8] hover:bg-[#ede5d3] transition p-6 md:p-10 h-full group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-6 md:mb-8">
                    <div className="font-serif text-5xl md:text-6xl italic text-[#8b6f3a]">
                      {section.num}
                    </div>
                    <motion.span
                      animate={{ x: hoveredCard === i ? 4 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-2xl text-[#8b6f3a] mt-2"
                    >
                      →
                    </motion.span>
                  </div>
                  <h3 className="font-serif text-2xl md:text-3xl mb-1 md:mb-2">{section.title}</h3>
                  <p className="text-sm md:text-base italic text-[#8b6f3a] mb-3 md:mb-4">{section.subtitle}</p>
                  <p className="text-sm md:text-base text-[#5c4d2e] leading-relaxed mb-6 md:mb-8">{section.desc}</p>
                  <div className="flex items-center gap-2 text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a]">
                    <span className="w-6 h-px bg-[#8b6f3a]"></span>
                    <span>{section.stat}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quote footer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2 }}
          className="mt-16 md:mt-24 mb-8 md:mb-16 text-center"
        >
          <p className="font-serif text-xl md:text-3xl italic text-[#5c4d2e] max-w-3xl mx-auto px-5">
            "Every word you record today is a gift wrapped<br className="hidden md:block"/>
            for someone yet to open it."
          </p>
        </motion.div>
      </main>
    </div>
  )
}