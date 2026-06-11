'use client'

import { SignInButton, SignUpButton, Show, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { useState, useEffect } from 'react'

function Particles() {
  const [mounted, setMounted] = useState(false)
  const [particles, setParticles] = useState<Array<{x: number, y: number, x2: number, y2: number, duration: number, delay: number}>>([])

  useEffect(() => {
    setMounted(true)
    setParticles(
      [...Array(15)].map(() => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        x2: Math.random() * 100,
        y2: Math.random() * 100,
        duration: 15 + Math.random() * 15,
        delay: Math.random() * 5,
      }))
    )
  }, [])

  if (!mounted) return null

  return (
    <>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 bg-[#8b6f3a] rounded-full"
          initial={{ x: `${p.x}%`, y: `${p.y}%`, opacity: 0 }}
          animate={{
            y: [`${p.y}%`, `${p.y2}%`],
            x: [`${p.x}%`, `${p.x2}%`],
            opacity: [0, 0.3, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}
    </>
  )
}

export default function Home() {
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null)

  const chapters = [
    {
      num: 'i.',
      title: 'Your life, as a timeline.',
      desc: 'Build a beautiful timeline of your life—from birth to the milestones that shaped you. Share photos, voice notes, and amusing anecdotes only you can tell.',
      label: 'The Timeline',
      details: [
        'Begin with the day you were born and add every milestone that mattered—childhood adventures, the first time you fell in love, your wedding day, the births of your children, career achievements, the quiet Tuesdays that turned out to mean something.',
        'Upload photos and short videos to bring each moment to life. Record voice notes to narrate the funny, tender, or formative stories behind each one—in your own voice, in your own words.',
        'Add amusing anecdotes that capture who you really were—the running jokes, the embarrassing moments, the small wisdoms you collected along the way.',
        'Future generations can scroll through your life like a gallery, hearing you describe what you were thinking, what mattered, what you learned. You decide who can see what—some chapters for everyone, some for specific people only.',
      ],
    },
    {
      num: 'ii.',
      title: 'Letters across time.',
      desc: 'Record video and written messages, scheduled to arrive on the days that matter—weddings, eighteenth birthdays, milestones yet to come.',
      label: 'The Messages',
      details: [
        'Record video messages for your grandchildren\'s eighteenth birthdays—even ones not yet born. Write a letter to your spouse for your fiftieth anniversary, even if you won\'t be there.',
        'Schedule messages by date or by event—graduations, weddings, the birth of a great-grandchild, or simply "five years after I\'m gone."',
        'Each recipient gets a private link when the time comes. They watch when they\'re ready. As many times as they need.',
        'No more "I wish I\'d told them"—say it now, deliver it then.',
      ],
    },
    {
      num: 'iii.',
      title: 'Affairs in order.',
      desc: 'Pre-arrange your final wishes—funeral preferences, contacts to notify, important documents. Let your family grieve, not arrange.',
      label: 'The Arrangements',
      details: [
        'Choose your funeral home, florist, and clergy in advance. Document your wishes for the service—music, readings, who speaks.',
        'Build a contact list of everyone who should be notified, with notes on how to reach them and what to say.',
        'Securely store account information, important documents, and the small details that only you know—where the spare key is, how to access the safe.',
        'When the time comes, your designated executor uploads a death certificate. Everything unlocks. Notifications go out. The plan executes itself.',
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#2c2416] relative overflow-x-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{ 
            x: [0, 200, -50, 100, 0], 
            y: [0, 150, 200, 50, 0],
            scale: [1, 1.4, 0.9, 1.2, 1],
          }}
          transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -left-40 w-[400px] md:w-[800px] h-[400px] md:h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,111,58,0.25) 0%, rgba(139,111,58,0.05) 40%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <motion.div
          animate={{ 
            x: [0, -150, 50, -100, 0], 
            y: [0, 200, -50, 150, 0],
            scale: [1, 1.5, 1, 1.3, 1],
          }}
          transition={{ duration: 50, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 -right-40 w-[450px] md:w-[900px] h-[450px] md:h-[900px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(192,57,43,0.15) 0%, rgba(192,57,43,0.03) 40%, transparent 70%)',
            filter: 'blur(100px)',
          }}
        />
        <motion.div
          animate={{ 
            x: [0, 150, -50, 200, 0], 
            y: [0, -100, 50, -150, 0],
            scale: [1, 1.2, 1.4, 0.95, 1],
          }}
          transition={{ duration: 60, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 left-1/4 w-[350px] md:w-[700px] h-[350px] md:h-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(92,77,46,0.2) 0%, rgba(92,77,46,0.04) 40%, transparent 70%)',
            filter: 'blur(90px)',
          }}
        />
        <motion.div
          animate={{ 
            x: [0, -150, 100, -50, 0], 
            y: [0, 150, -100, 50, 0],
            scale: [1, 1.3, 0.9, 1.2, 1],
          }}
          transition={{ duration: 55, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-2/3 left-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,111,58,0.18) 0%, transparent 70%)',
            filter: 'blur(85px)',
          }}
        />

        <Particles />
      </div>

      {/* Grain overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-50" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
      }}/>

      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex justify-between items-center px-5 md:px-12 py-5 md:py-8 max-w-[1400px] mx-auto gap-3"
      >
        <div className="flex items-baseline gap-2 md:gap-3 min-w-0">
          <span className="text-xl md:text-3xl font-serif italic tracking-tight">Ready</span>
          <motion.span 
            initial={{ width: 0 }}
            animate={{ width: 24 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="h-px bg-[#2c2416] hidden sm:block"
          />
          <span className="text-[10px] md:text-xl tracking-[0.2em] md:tracking-[0.3em] uppercase text-[#5c4d2e] truncate">with love</span>
        </div>
        <div className="flex items-center gap-3 md:gap-8 text-[10px] md:text-sm tracking-widest uppercase">
          <Show when="signed-out">
            <SignInButton>
              <button className="hover:text-[#8b6f3a] transition cursor-pointer whitespace-nowrap">Sign In</button>
            </SignInButton>
            <SignUpButton>
              <button className="border border-[#2c2416] px-3 md:px-6 py-2 md:py-3 hover:bg-[#2c2416] hover:text-[#f5f1e8] transition cursor-pointer whitespace-nowrap">Begin</button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard" className="hover:text-[#8b6f3a] transition">Dashboard</Link>
            <UserButton />
          </Show>
        </div>
      </motion.nav>

      {/* Hero */}
      <main className="relative z-10 max-w-[1400px] mx-auto px-5 md:px-12 pt-10 md:pt-20 pb-20 md:pb-32">
        <div className="grid grid-cols-12 gap-4 md:gap-8 items-end">
          <div className="col-span-12 md:col-span-7 relative">
            <div className="absolute inset-0 -m-4 md:-m-8 bg-[#f5f1e8]/60 backdrop-blur-xl rounded-2xl md:rounded-3xl -z-10"></div>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] uppercase text-[#8b6f3a] mb-5 md:mb-8 relative"
            >
              · Volume One · A guide to legacy ·
            </motion.p>
            
            <h1 className="font-serif text-5xl sm:text-6xl md:text-9xl leading-[0.9] tracking-tight mb-6 md:mb-8 relative">
              <motion.span 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="block"
              >
                The story
              </motion.span>
              <motion.span 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="block italic text-[#8b6f3a]"
              >
                you leave
              </motion.span>
              <motion.span 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="block"
              >
                behind.
              </motion.span>
            </h1>

            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: 96 }}
              transition={{ duration: 1, delay: 1.2 }}
              className="h-px bg-[#2c2416] my-5 md:my-8 relative"
            />

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1.4 }}
              className="text-base md:text-lg leading-relaxed max-w-md text-[#5c4d2e] font-light relative"
            >
              Your final chapter, written with intention. Plan your affairs, share your stories, and leave messages for those who matter most—delivered when they need them most.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.6 }}
              className="flex flex-col sm:flex-row gap-4 md:gap-6 mt-8 md:mt-12 sm:items-center flex-wrap relative"
            >
              <Show when="signed-out">
                <SignUpButton>
                  <button className="group flex items-center justify-center gap-3 bg-[#2c2416] text-[#f5f1e8] px-6 md:px-8 py-4 hover:bg-[#8b6f3a] transition cursor-pointer w-full sm:w-auto">
                    <span className="tracking-[0.2em] uppercase text-xs md:text-sm">Begin Your Story</span>
                    <span className="group-hover:translate-x-1 transition">→</span>
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <Link href="/dashboard" className="group flex items-center justify-center gap-3 bg-[#2c2416] text-[#f5f1e8] px-6 md:px-8 py-4 hover:bg-[#8b6f3a] transition w-full sm:w-auto">
                  <span className="tracking-[0.2em] uppercase text-xs md:text-sm">Continue Your Story</span>
                  <span className="group-hover:translate-x-1 transition">→</span>
                </Link>
              </Show>
              <a href="#chapters" className="text-xs md:text-sm tracking-[0.2em] uppercase border-b border-[#2c2416] pb-1 hover:text-[#8b6f3a] hover:border-[#8b6f3a] transition self-start sm:self-auto">
                Learn more
              </a>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.5, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="col-span-12 md:col-span-5 hidden md:block"
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: [0, 1, 0, -1, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              >
                <svg viewBox="0 0 400 500" className="w-full">
                  <defs>
                    <linearGradient id="leaf" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8b6f3a" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="#5c4d2e" stopOpacity="0.5"/>
                    </linearGradient>
                  </defs>
                  <g transform="translate(200,250)">
                    <path d="M 0,-200 Q -60,-180 -80,-140 Q -100,-100 -90,-60 Q -110,-50 -120,-20 Q -130,10 -110,30 Q -130,50 -120,80 Q -110,110 -80,120 Q -60,160 -30,180 Q 0,200 30,180 Q 60,160 80,120 Q 110,110 120,80 Q 130,50 110,30 Q 130,10 120,-20 Q 110,-50 90,-60 Q 100,-100 80,-140 Q 60,-180 0,-200 Z" 
                      fill="url(#leaf)" stroke="#5c4d2e" strokeWidth="1" opacity="0.7"/>
                    <line x1="0" y1="-200" x2="0" y2="200" stroke="#5c4d2e" strokeWidth="1" opacity="0.4"/>
                    {[-160, -120, -80, -40, 0, 40, 80, 120, 160].map(y => (
                      <g key={y}>
                        <line x1="0" y1={y} x2={-80 + Math.abs(y)/3} y2={y - 10} stroke="#5c4d2e" strokeWidth="0.5" opacity="0.3"/>
                        <line x1="0" y1={y} x2={80 - Math.abs(y)/3} y2={y - 10} stroke="#5c4d2e" strokeWidth="0.5" opacity="0.3"/>
                      </g>
                    ))}
                  </g>
                </svg>
              </motion.div>
              <div className="absolute top-4 right-4 text-xs tracking-[0.3em] uppercase text-[#8b6f3a]" style={{writingMode: 'vertical-rl'}}>
                Quercus · Strength · Endurance
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Quote divider */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 1.2 }}
        className="relative z-10 border-y border-[#2c2416]/20 py-10 md:py-16 my-8 md:my-12 backdrop-blur-md bg-[#f5f1e8]/40"
      >
        <div className="max-w-4xl mx-auto px-5 md:px-12 text-center">
          <p className="font-serif text-xl md:text-4xl italic leading-relaxed text-[#5c4d2e]">
            "The greatest gift you leave behind<br/>
            is not what you owned,<br/>
            but what you said—and when."
          </p>
        </div>
      </motion.section>

      {/* Chapters - Expandable */}
      <section id="chapters" className="relative z-10 max-w-[1400px] mx-auto px-5 md:px-12 py-16 md:py-24">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-12 gap-4 md:gap-8 mb-10 md:mb-16"
        >
          <div className="col-span-12 md:col-span-6">
            <p className="text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] uppercase text-[#8b6f3a] mb-3 md:mb-4">Chapter Two</p>
            <h2 className="font-serif text-4xl md:text-6xl leading-tight">
              Three ways<br/>
              <span className="italic">to be remembered.</span>
            </h2>
          </div>
          <div className="col-span-12 md:col-span-6 flex md:items-end mt-3 md:mt-0">
            <p className="text-xs md:text-sm tracking-wide text-[#8b6f3a] italic">
              Tap any chapter to read more →
            </p>
          </div>
        </motion.div>

        <div className="space-y-px bg-[#2c2416]/20">
          {chapters.map((chapter, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="bg-[#f5f1e8] hover:bg-[#ede5d3] transition cursor-pointer group"
              onClick={() => setExpandedChapter(expandedChapter === i ? null : i)}
            >
              <div className="p-6 md:p-12 flex items-start gap-4 md:gap-12">
                <div className="font-serif text-4xl md:text-7xl text-[#8b6f3a] italic flex-shrink-0 w-10 md:w-20">
                  {chapter.num}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-xl md:text-3xl mb-2 md:mb-3">{chapter.title}</h3>
                  <p className="text-sm md:text-base text-[#5c4d2e] leading-relaxed">{chapter.desc}</p>
                </div>
                <motion.div
                  animate={{ rotate: expandedChapter === i ? 45 : 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-2xl md:text-3xl font-serif text-[#8b6f3a] flex-shrink-0"
                >
                  +
                </motion.div>
              </div>

              <AnimatePresence>
                {expandedChapter === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 md:px-12 pb-6 md:pb-12 md:pl-44 border-t border-[#2c2416]/10 pt-6 md:pt-8">
                      <div className="space-y-3 md:space-y-4 max-w-3xl">
                        {chapter.details.map((detail, j) => (
                          <motion.p
                            key={j}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: j * 0.1 }}
                            className="text-sm md:text-base text-[#5c4d2e] leading-relaxed font-light"
                          >
                            <span className="font-serif italic text-[#8b6f3a] mr-2">·</span>
                            {detail}
                          </motion.p>
                        ))}
                      </div>
                      <div className="mt-6 md:mt-8 text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a]">
                        {chapter.label}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Guided Interview Section */}
      <section className="relative z-10 max-w-[1400px] mx-auto px-5 md:px-12 py-16 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-12 gap-6 md:gap-8 items-center"
        >
          <div className="col-span-12 md:col-span-6 order-2 md:order-1">
            <p className="text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] uppercase text-[#8b6f3a] mb-4 md:mb-6">Chapter Three</p>
            <h2 className="font-serif text-4xl md:text-7xl leading-[0.95] mb-6 md:mb-8">
              An interview<br/>
              <span className="italic">with the ones</span><br/>
              who knew you.
            </h2>
            <div className="w-16 md:w-24 h-px bg-[#2c2416] my-5 md:my-8"></div>
            <p className="text-base md:text-lg leading-relaxed text-[#5c4d2e] font-light mb-4 md:mb-6">
              Your story isn't only yours to tell. It lives in the memories of the people who loved you.
            </p>
            <p className="text-base md:text-lg leading-relaxed text-[#5c4d2e] font-light mb-6 md:mb-8">
              A guided video interview gently prompts your loved ones to share the stories they remember about you—the time you made them laugh until they cried, the advice that changed everything, the small moments that shaped them. All preserved, all part of your legacy.
            </p>
            <div className="flex items-center gap-3 text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a]">
              <span className="w-8 md:w-12 h-px bg-[#8b6f3a]"></span>
              <span>Coming with launch</span>
            </div>
          </div>

          <div className="col-span-12 md:col-span-6 order-1 md:order-2">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <div className="aspect-square relative bg-[#ede5d3] border border-[#2c2416]/20 p-6 md:p-12 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a]">Question 03 of 12</p>
                  <div className="flex gap-1 items-center">
                    <motion.div 
                      animate={{ opacity: [0.3, 1, 0.3] }} 
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-2 h-2 bg-[#c0392b] rounded-full"
                    />
                    <span className="text-[10px] md:text-xs tracking-widest uppercase text-[#5c4d2e]">REC</span>
                  </div>
                </div>

                <div className="space-y-4 md:space-y-6">
                  <p className="font-serif text-lg md:text-3xl italic text-[#2c2416] leading-snug">
                    "Tell me about a time<br/>
                    they made you<br/>
                    laugh until you cried."
                  </p>
                  <div className="flex gap-1 items-end h-8 md:h-10">
                    {[...Array(20)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: ['8px', `${10 + (i * 3) % 30}px`, '8px'] }}
                        transition={{ duration: 1 + (i % 3) * 0.2, repeat: Infinity, delay: i * 0.05 }}
                        className="w-1 bg-[#8b6f3a]"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-end text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#5c4d2e] gap-2">
                  <span className="truncate">From Sarah, your daughter</span>
                  <span className="flex-shrink-0">02:14</span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <motion.section 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 max-w-[1400px] mx-auto px-5 md:px-12 py-16 md:py-32 text-center"
      >
        <p className="text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] uppercase text-[#8b6f3a] mb-6 md:mb-8">· Begin ·</p>
        <h2 className="font-serif text-4xl md:text-8xl leading-[0.95] mb-8 md:mb-12">
          Your legacy<br/>
          <span className="italic">starts</span> with a sentence.
        </h2>
        <Show when="signed-out">
          <SignUpButton>
            <button className="bg-[#2c2416] text-[#f5f1e8] px-8 md:px-12 py-4 md:py-5 tracking-[0.2em] uppercase text-xs md:text-sm hover:bg-[#8b6f3a] transition cursor-pointer">
              Write the first line
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <Link href="/dashboard" className="inline-block bg-[#2c2416] text-[#f5f1e8] px-8 md:px-12 py-4 md:py-5 tracking-[0.2em] uppercase text-xs md:text-sm hover:bg-[#8b6f3a] transition">
            Continue writing
          </Link>
        </Show>
      </motion.section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#2c2416]/20 mt-16 md:mt-24">
        <div className="max-w-[1400px] mx-auto px-5 md:px-12 py-8 md:py-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
          <div className="flex items-baseline gap-2 md:gap-3">
            <span className="text-xl md:text-2xl font-serif italic">Ready</span>
            <span className="w-4 md:w-6 h-px bg-[#2c2416]"></span>
            <span className="text-[10px] md:text-sm tracking-[0.3em] uppercase text-[#5c4d2e]">with love</span>
          </div>
          <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a]">
            © MMXXVI · Made with care · Made to last
          </p>
        </div>
      </footer>
    </div>
  )
}